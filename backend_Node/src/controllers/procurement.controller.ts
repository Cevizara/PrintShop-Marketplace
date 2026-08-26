import { Request, Response } from "express";
import { Types } from "mongoose";
import Bid, { IBid } from "../models/Bid";
import { sledeciBroj, sledeciBrojFakture } from "../models/Counter";
import Invoice from "../models/Invoice";
import Procurement, { IProcurement } from "../models/Procurement";
import Product from "../models/Product";
import User from "../models/User";
import { posalji } from "../utils/mail";
import { izvestajUPdf } from "../utils/pdf";
import { uBroj } from "../utils/validation";

/** Tekst zadatka: licitacija traje 10 minuta. */
const TRAJANJE_MINUTA = 10;

const POLJA_STAMPARA = "institution.name institution.city";

/**
 * ==========================================================================
 *  ZAKLJUCIVANJE LICITACIJE
 * ==========================================================================
 *
 * Fusnota 6 teksta zadatka: "Nije potrebno realizovati tajmer u bazi niti
 * WebSocket / Background job, vec prilikom naredne prijave u sistem ustanove
 * koja je raspisala javnu nabavku, proveriti da li je prosao vremenski
 * interval, i zakljuciti sve pristigle ponude izborom najbolje."
 *
 * Dakle zakljucivanje je LENJO: ne desava se samo od sebe u trenutku isteka,
 * nego prvi put kada neko pogleda nabavku posle isteka roka.
 *
 * Pobednik je, po tekstu: "stamparija koja je imala najnizu ukupnu ponudu za
 * sve proizvode I DOVOLJNU KOLICINU SVAKOG PROIZVODA NA STANJU". Oba uslova, i
 * to redom - prvo se odbace ponude koje nemaju pokrice na lageru, pa se medju
 * preostalima trazi najniza.
 *
 * Zasto se lager proverava TEK SADA, a ne pri slanju ponude: izmedju ponude i
 * isteka roka prodje do deset minuta, a za to vreme stamparija moze da rasproda
 * zalihe kroz obicne narudzbine. Uslov iz teksta se odnosi na trenutak
 * dodeljivanja.
 */
async function zakljuci(nabavka: IProcurement): Promise<IProcurement> {
  const sada = new Date();

  /*
   * Brava. settledAt se postavlja atomicno, PRE racunanja: zakljucivanje se
   * okida sa vise strana (kada ustanova otvori svoj spisak, kada stampar otvori
   * svoj), pa bi bez ovoga dva istovremena poziva mogla da naprave dve fakture
   * za istu nabavku. Ko prvi postavi settledAt, taj i racuna.
   */
  const zauzeta = await Procurement.findOneAndUpdate(
    { _id: nabavka._id, status: "OPEN", deadline: { $lte: sada }, settledAt: null },
    { $set: { settledAt: sada } },
    { new: true }
  );

  if (!zauzeta) {
    // Ili rok nije prosao, ili je neko drugi vec preuzeo posao.
    return (await Procurement.findById(nabavka._id))!;
  }

  const ponude = await Bid.find({ procurementId: zauzeta._id }).sort({ total: 1 });

  if (!ponude.length) {
    zauzeta.status = "FAILED";
    zauzeta.failureReason = "Do isteka roka nije stigla nijedna ponuda.";
    await zauzeta.save();
    return zauzeta;
  }

  // Ponude su vec poredjane po ukupnom iznosu, pa se uzima prva koja ima
  // pokrice na lageru - to je istovremeno i najniza ispravna.
  for (const ponuda of ponude) {
    const pokriva = await imaDovoljnoNaStanju(ponuda);
    if (!pokriva) continue;

    const faktura = await napraviFakturu(zauzeta, ponuda);

    // Ako je lager pao izmedju provere i skidanja, faktura ne nastaje i prelazi
    // se na sledecu ponudu - ista logika kao pri zatvaranju korpe.
    if (!faktura) continue;

    zauzeta.status = "AWARDED";
    zauzeta.winnerBidId = ponuda._id as Types.ObjectId;
    zauzeta.winnerPrinterId = ponuda.printerId;
    zauzeta.winnerTotal = ponuda.total;
    zauzeta.invoiceId = faktura._id as Types.ObjectId;
    await zauzeta.save();
    return zauzeta;
  }

  zauzeta.status = "FAILED";
  zauzeta.failureReason =
    "Nijedna štamparija nije imala dovoljne količine svih traženih proizvoda na stanju.";
  await zauzeta.save();
  return zauzeta;
}

/** Ima li stampar na stanju sve sto je ponudio, u trazenim kolicinama. */
async function imaDovoljnoNaStanju(ponuda: IBid): Promise<boolean> {
  for (const red of ponuda.lines) {
    const dovoljno = await Product.exists({
      _id: red.productId,
      printerId: ponuda.printerId,
      stock: { $gte: red.quantity },
    });
    if (!dovoljno) return false;
  }
  return true;
}

/**
 * Fakturisanje pobednicke ponude.
 *
 * Tekst zadatka: "trazeni proizvodi se fakturisu, a status narudzbine je
 * u stampi" - dakle preskace se "naruceno", jer je licitacija vec odigrala
 * ulogu potvrde.
 *
 * Lager se skida ATOMICNO, istim postupkom kao pri zatvaranju korpe, i vraca
 * ako neka stavka padne. Vidi cart.controller.
 */
async function napraviFakturu(nabavka: IProcurement, ponuda: IBid) {
  const skinuto: { productId: Types.ObjectId; quantity: number }[] = [];

  for (const red of ponuda.lines) {
    const ishod = await Product.findOneAndUpdate(
      { _id: red.productId, printerId: ponuda.printerId, stock: { $gte: red.quantity } },
      { $inc: { stock: -red.quantity } }
    );

    if (!ishod) {
      for (const vraceno of skinuto) {
        await Product.updateOne({ _id: vraceno.productId }, { $inc: { stock: vraceno.quantity } });
      }
      return null;
    }

    skinuto.push({ productId: red.productId, quantity: red.quantity });
  }

  return Invoice.create({
    number: await sledeciBrojFakture(),
    clientId: nabavka.clientId,
    printerId: ponuda.printerId,
    items: ponuda.lines.map((red) => ({
      _id: new Types.ObjectId(),
      productId: red.productId,
      code: red.productCode,
      name: red.productName,
      unitPrice: red.unitPrice,
      quantity: red.quantity,
      color: "Bela",
      printType: "",
      extraPricePerPiece: 0,
      printText: "",
      printImage: "",
      printX: 50,
      printY: 50,
      printScale: 46,
      lineTotal: red.lineTotal,
    })),
    total: ponuda.total,
    status: "PRINTING",
    procurementId: nabavka._id,
  });
}

/** Zakljucuje sve istekle nabavke iz spiska. Poziva se pri svakom citanju. */
async function zakljuciIstekle(nabavke: IProcurement[]): Promise<void> {
  const sada = new Date();
  for (const nabavka of nabavke) {
    if (nabavka.status === "OPEN" && nabavka.deadline <= sada) {
      await zakljuci(nabavka);
    }
  }
}

export class ProcurementController {
  // =========================================================================
  //  KLIJENT - PRAVNO LICE
  // =========================================================================

  /**
   * Javne nabavke koje je raspisala prijavljena ustanova.
   *
   * Pre prikaza se zakljucuju sve one kojima je rok istekao - to je bas onaj
   * "lenji" postupak koji fusnota 6 opisuje.
   */
  moje = async (req: Request, res: Response): Promise<void> => {
    try {
      const svoje = await Procurement.find({ clientId: req.user!.id });
      await zakljuciIstekle(svoje);

      const nabavke = await Procurement.find({ clientId: req.user!.id })
        .sort({ createdAt: -1 })
        .populate("winnerPrinterId", POLJA_STAMPARA);

      // Broj pristiglih ponuda po nabavci - jednim upitom, ne po nabavci.
      const brojevi = await Bid.aggregate<{ _id: Types.ObjectId; broj: number }>([
        { $match: { procurementId: { $in: nabavke.map((n) => n._id) } } },
        { $group: { _id: "$procurementId", broj: { $sum: 1 } } },
      ]);

      const poNabavci = new Map(brojevi.map((b) => [String(b._id), b.broj]));

      res.json(
        nabavke.map((n) => ({
          ...n.toObject(),
          bidCount: poNabavci.get(String(n._id)) ?? 0,
          secondsLeft: Math.max(0, Math.round((n.deadline.getTime() - Date.now()) / 1000)),
        }))
      );
    } catch (greska) {
      console.error("moje:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Izvestaj o jednoj nabavci: SVE poslate ponude i ona koja je pobedila.
   *
   * Tekst zadatka trazi PDF; ovde se salju podaci, a strana ih prikazuje.
   * PDF je crvena stavka i jos nije uradjen.
   */
  izvestaj = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator nabavke." });
        return;
      }

      const nabavka = await Procurement.findOne({ _id: id, clientId: req.user!.id });

      if (!nabavka) {
        res.status(404).json({ message: "Javna nabavka nije pronađena." });
        return;
      }

      if (nabavka.status === "OPEN" && nabavka.deadline <= new Date()) {
        await zakljuci(nabavka);
      }

      const [osvezena, ponude] = await Promise.all([
        Procurement.findById(id).populate("winnerPrinterId", POLJA_STAMPARA),
        Bid.find({ procurementId: id })
          .sort({ total: 1 })
          .populate("printerId", POLJA_STAMPARA),
      ]);

      res.json({ procurement: osvezena, bids: ponude });
    } catch (greska) {
      console.error("izvestaj:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * PDF izvestaj o licitaciji.
   *
   * Tekst zadatka: "svaka ustanova dobija u svom odeljku za javne nabavke PDF
   * izvestaj o svim poslatim ponudama i onoj koja je dobila javnu nabavku".
   *
   * Izvestaj se pravi tek kada je licitacija zavrsena - dok traje, spisak
   * ponuda bi bio delimican i ne bi imao smisla kao dokument.
   */
  izvestajPdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator nabavke." });
        return;
      }

      const nabavka = await Procurement.findOne({ _id: id, clientId: req.user!.id });

      if (!nabavka) {
        res.status(404).json({ message: "Javna nabavka nije pronađena." });
        return;
      }

      if (nabavka.status === "OPEN" && nabavka.deadline <= new Date()) {
        await zakljuci(nabavka);
      }

      const osvezena = (await Procurement.findById(id))!;

      if (osvezena.status === "OPEN") {
        res.status(409).json({
          message: "Izveštaj se pravi tek kada licitacija bude zaključena.",
        });
        return;
      }

      const [ustanova, ponude] = await Promise.all([
        User.findById(osvezena.clientId),
        Bid.find({ procurementId: id }).sort({ total: 1 }).populate("printerId", POLJA_STAMPARA),
      ]);

      const bafer = await izvestajUPdf({
        nabavka: {
          number: osvezena.number,
          createdAt: osvezena.createdAt,
          deadline: osvezena.deadline,
          status: osvezena.status,
          items: osvezena.items.map((s) => ({
            name: s.name,
            categoryName: s.categoryName,
            quantity: s.quantity,
          })),
          winnerBidId: osvezena.winnerBidId,
          winnerTotal: osvezena.winnerTotal,
          failureReason: osvezena.failureReason,
        },
        ustanova: {
          name:
            ustanova?.institution?.name ??
            `${ustanova?.firstName ?? ""} ${ustanova?.lastName ?? ""}`.trim(),
        },
        ponude: ponude.map((p) => {
          const stampar = p.printerId as unknown as {
            institution?: { name?: string };
          };
          return {
            _id: p._id,
            total: p.total,
            createdAt: p.createdAt,
            printerName: stampar?.institution?.name ?? "",
            lines: p.lines.map((l) => ({
              productName: l.productName,
              productCode: l.productCode,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
            })),
          };
        }),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="izvestaj-${osvezena.number}.pdf"`);
      res.send(bafer);
    } catch (greska) {
      console.error("izvestajPdf:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  // =========================================================================
  //  STAMPAR
  // =========================================================================

  /**
   * Otvorene javne nabavke, sa podatkom da li je ova stamparija vec poslala
   * ponudu - jer sme samo jednu.
   *
   * I ovde se prvo zakljucuju istekle. Tekst trazi zakljucivanje pri prijavi
   * ustanove; ovo je dodatak koji nista ne kosta, a ucini da ishod bude vidljiv
   * i kada ustanova jos nije svratila.
   */
  otvorene = async (req: Request, res: Response): Promise<void> => {
    try {
      await zakljuciIstekle(await Procurement.find({ status: "OPEN" }));

      const nabavke = await Procurement.find({ status: "OPEN" })
        .sort({ deadline: 1 })
        .populate("clientId", "username institution.name institution.city");

      const mojePonude = await Bid.find({
        printerId: req.user!.id,
        procurementId: { $in: nabavke.map((n) => n._id) },
      });

      const poNabavci = new Map(mojePonude.map((p) => [String(p.procurementId), p]));

      res.json(
        nabavke.map((n) => ({
          ...n.toObject(),
          myBid: poNabavci.get(String(n._id)) ?? null,
          secondsLeft: Math.max(0, Math.round((n.deadline.getTime() - Date.now()) / 1000)),
        }))
      );
    } catch (greska) {
      console.error("otvorene:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Slanje ponude.
   *
   * Stampar za svaku trazenu stavku bira SVOJ proizvod i cenu po komadu.
   * Nista se ne pogadja i nista se ne uparuje po nazivu - vidi model Bid.
   *
   * Ukupan iznos se racuna NA SERVERU, iz cena po komadu i trazenih kolicina.
   * Da se primao iz zahteva, stampar bi mogao da posalje jedan iznos u polju za
   * poredjenje, a drugi u stavkama.
   */
  posaljiPonudu = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator nabavke." });
        return;
      }

      const nabavka = await Procurement.findById(id);

      if (!nabavka) {
        res.status(404).json({ message: "Javna nabavka nije pronađena." });
        return;
      }

      if (nabavka.status !== "OPEN" || nabavka.deadline <= new Date()) {
        res.status(409).json({ message: "Rok za slanje ponuda je istekao." });
        return;
      }

      if (await Bid.exists({ procurementId: id, printerId: req.user!.id })) {
        res.status(409).json({
          message: "Već ste poslali ponudu za ovu javnu nabavku. Dozvoljena je jedna po nabavci.",
        });
        return;
      }

      const poslateStavke = Array.isArray(req.body.lines) ? req.body.lines : [];

      // Ponuda mora pokriti SVE trazene proizvode - tekst zadatka: "jednu
      // ponudu (sa svim trazenim proizvodima)". Delimicna ponuda se ne prima.
      if (poslateStavke.length !== nabavka.items.length) {
        res.status(400).json({
          message: "Ponuda mora sadržati sve tražene proizvode.",
        });
        return;
      }

      const redovi = [];
      let ukupno = 0;

      for (const trazena of nabavka.items) {
        const poslata = poslateStavke.find(
          (s: { itemId?: string }) => String(s.itemId) === String(trazena._id)
        );

        if (!poslata) {
          res.status(400).json({
            message: `Nedostaje ponuda za traženu stavku „${trazena.name}“.`,
          });
          return;
        }

        const cena = uBroj(poslata.unitPrice, -1);

        if (cena < 0) {
          res.status(400).json({
            message: "Podaci nisu ispravni.",
            errors: [
              {
                field: "unitPrice",
                message: `Cena za „${trazena.name}“ mora biti broj koji nije negativan.`,
              },
            ],
          });
          return;
        }

        // Ponudjeni proizvod mora biti proizvod BAS OVE stamparije. Bez ove
        // provere bi stampar mogao da ponudi tudji lager.
        const proizvod = await Product.findOne({
          _id: Types.ObjectId.isValid(String(poslata.productId)) ? poslata.productId : null,
          printerId: req.user!.id,
        });

        if (!proizvod) {
          res.status(400).json({
            message: `Za „${trazena.name}“ niste izabrali proizvod iz svog kataloga.`,
          });
          return;
        }

        const iznos = cena * trazena.quantity;
        ukupno += iznos;

        redovi.push({
          _id: new Types.ObjectId(),
          itemId: trazena._id,
          productId: proizvod._id,
          productName: proizvod.name,
          productCode: proizvod.code,
          unitPrice: cena,
          quantity: trazena.quantity,
          lineTotal: iznos,
        });
      }

      const ponuda = await Bid.create({
        procurementId: nabavka._id,
        printerId: req.user!.id,
        lines: redovi,
        total: ukupno,
      });

      res.status(201).json({
        message: `Ponuda je poslata. Ukupan iznos: ${ukupno} RSD.`,
        bid: ponuda,
      });
    } catch (greska) {
      console.error("posaljiPonudu:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Izvestaj za stampariju: nabavke na koje je slala ponude i njihov ishod.
   * Tekst zadatka trazi izvestaj o SVIM poslatim ponudama i onoj koja je dobila.
   */
  mojePonude = async (req: Request, res: Response): Promise<void> => {
    try {
      const ponude = await Bid.find({ printerId: req.user!.id }).sort({ createdAt: -1 });

      const nabavke = await Procurement.find({
        _id: { $in: ponude.map((p) => p.procurementId) },
      }).populate("winnerPrinterId", POLJA_STAMPARA);

      await zakljuciIstekle(nabavke);

      const osvezene = await Procurement.find({
        _id: { $in: ponude.map((p) => p.procurementId) },
      })
        .populate("winnerPrinterId", POLJA_STAMPARA)
        .populate("clientId", "username institution.name institution.city");

      const poId = new Map(osvezene.map((n) => [String(n._id), n]));

      res.json(
        ponude.map((p) => {
          const nabavka = poId.get(String(p.procurementId));
          return {
            bid: p,
            procurement: nabavka,
            won: String(nabavka?.winnerBidId ?? "") === String(p._id),
          };
        })
      );
    } catch (greska) {
      console.error("mojePonude:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}

/**
 * Pravi javnu nabavku iz korpe pravnog lica.
 *
 * Izvezeno zasebno jer je poziva CartController: pravno lice pritiskom na
 * POTVRDI ne dobija fakture nego raspisuje nabavku. Sam broj se, kao i kod
 * faktura, uzima atomicnim brojacem.
 */
export async function raspisiIzKorpe(
  clientId: string,
  stavke: { productId: unknown; name: string; categoryName: string; subcategoryName: string; quantity: number }[]
): Promise<IProcurement> {
  const broj = await sledeciBroj("procurement");
  const godina = new Date().getFullYear();

  const nabavka = await Procurement.create({
    number: `JN-${godina}-${String(broj).padStart(4, "0")}`,
    clientId,
    items: stavke.map((s) => ({
      _id: new Types.ObjectId(),
      name: s.name,
      categoryName: s.categoryName,
      subcategoryName: s.subcategoryName,
      quantity: s.quantity,
      sourceProductId: s.productId,
    })),
    createdAt: new Date(),
    deadline: new Date(Date.now() + TRAJANJE_MINUTA * 60 * 1000),
    status: "OPEN",
  });

  /*
   * Obavestenje stamparijama.
   *
   * Tekst zadatka: "Svim stamparijama treba da stigne i i-mejl poruka da je
   * otvorena licitacija za javnu nabavku SA LISTOM POTREBNIH PROIZVODA."
   *
   * Salje se u pozadini, bez await: nabavka je vec raspisana i klijent ne treba
   * da ceka na postu da bi dobio odgovor. Ako slanje padne, posao je i dalje
   * odradjen - stamparije nabavku vide i na svojoj strani "Licitacije".
   */
  void obavestiStamparije(nabavka);

  return nabavka;
}

/** Poruka svim odobrenim stamparijama da je otvorena nova licitacija. */
async function obavestiStamparije(nabavka: IProcurement): Promise<void> {
  try {
    const [ustanova, stamparije] = await Promise.all([
      User.findById(nabavka.clientId),
      // Samo ODOBRENE: nalog koji ceka odobrenje jos ne posluje.
      User.find({ type: "PRINTER", status: "APPROVED" }).select("email institution.name"),
    ]);

    const naruclac = ustanova?.institution?.name ?? "naručilac";

    const spisak = nabavka.items
      .map((s, redni) => `  ${redni + 1}. ${s.name} — ${s.quantity} kom (${s.categoryName})`)
      .join("\n");

    const tekst =
      `Poštovani,\n\n` +
      `otvorena je licitacija za javnu nabavku ${nabavka.number}.\n` +
      `Naručilac: ${naruclac}\n` +
      `Ponude se primaju do ${nabavka.deadline.toLocaleString("sr-RS")}.\n\n` +
      `Traženi proizvodi:\n${spisak}\n\n` +
      `Ponudu šaljete na stranici „Licitacije“ u sistemu. Po nabavci se šalje\n` +
      `jedna ponuda, sa svim traženim proizvodima. Nabavku dobija najniža ukupna\n` +
      `ponuda koja u trenutku isteka roka ima dovoljne količine na stanju.\n\n` +
      `Printing House`;

    for (const stamparija of stamparije) {
      await posalji(
        stamparija.email,
        `Otvorena licitacija — javna nabavka ${nabavka.number}`,
        tekst
      );
    }
  } catch (greska) {
    // Obavestenje je pogodnost, ne uslov - neuspeh se zapisuje i tu se staje.
    console.error("obavestiStamparije:", greska);
  }
}
