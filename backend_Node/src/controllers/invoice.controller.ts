import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import Invoice, { IInvoice, InvoiceStatus, SEKVENCA_STATUSA } from "../models/Invoice";
import Product from "../models/Product";
import Rating from "../models/Rating";
import User from "../models/User";
import { posalji } from "../utils/mail";
import { fakturaUPdf } from "../utils/pdf";
import {
  naplatiLokalno,
  napraviPaymentIntent,
  potvrdiPaymentIntent,
  stripeJePodesen,
} from "../utils/placanje";

/**
 * Po cemu sme da se sortira tabela narudzbina.
 *
 * Spisak je zatvoren namerno: da se polje za sortiranje uzimalo pravo iz upita,
 * klijent bi mogao da sortira po bilo kom polju u dokumentu i time natera bazu
 * na skeniranje kolekcije. Ovako se prihvata samo ono sto tabela stvarno nudi.
 */
const DOZVOLJENO_SORTIRANJE: Record<string, string> = {
  number: "number",
  total: "total",
  status: "status",
  date: "createdAt",
  printer: "printerName",
  city: "printerCity",
};

/**
 * Stampar i grad se cuvaju na korisniku, a ne na fakturi, pa se tabela pravi
 * spajanjem. Bez ovoga sortiranje po nazivu stamparije ne bi bilo moguce u
 * bazi nego tek u memoriji, posle citanja svih redova.
 */
function spojiUcesnike(polje: "printerId" | "clientId"): PipelineStage[] {
  return [
    {
      $lookup: {
        from: "users",
        localField: polje,
        foreignField: "_id",
        as: "ucesnik",
      },
    },
    { $unwind: { path: "$ucesnik", preserveNullAndEmptyArrays: true } },
    {
      $addFields:
        polje === "printerId"
          ? {
              printerName: { $ifNull: ["$ucesnik.institution.name", ""] },
              printerCity: { $ifNull: ["$ucesnik.institution.city", ""] },
            }
          : {
              clientName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$ucesnik.firstName", ""] },
                      " ",
                      { $ifNull: ["$ucesnik.lastName", ""] },
                    ],
                  },
                },
              },
              clientUsername: { $ifNull: ["$ucesnik.username", ""] },
              clientInstitution: { $ifNull: ["$ucesnik.institution.name", ""] },
            },
    },
    { $project: { ucesnik: 0 } },
  ];
}

/** Kako se cita parametar za sortiranje iz upita. */
function redosled(req: Request, podrazumevano = "date"): Record<string, 1 | -1> {
  const polje = DOZVOLJENO_SORTIRANJE[String(req.query.sort || podrazumevano)] ?? "createdAt";
  const smer: 1 | -1 = String(req.query.dir || "desc") === "asc" ? 1 : -1;
  return { [polje]: smer };
}

export class InvoiceController {
  // =========================================================================
  //  KLIJENT
  // =========================================================================

  /**
   * Tabela narudzbina prijavljenog klijenta.
   *
   * Tekst zadatka trazi "sve prethodno realizovane i trenutno aktuelne jos uvek
   * nerealizovane narudzbine", dakle SVE - i zavrsene i one u toku. Zato ovde
   * nema filtriranja po statusu; filtriranje je stvar prikaza.
   *
   * clientId se uzima IZ TOKENA, nikada iz upita.
   */
  mojeNarudzbine = async (req: Request, res: Response): Promise<void> => {
    try {
      const fakture = await Invoice.aggregate([
        { $match: { clientId: new Types.ObjectId(req.user!.id) } },
        ...spojiUcesnike("printerId"),
        { $sort: redosled(req) },
      ]).collation({ locale: "sr", strength: 1 });

      res.json(fakture);
    } catch (greska) {
      console.error("mojeNarudzbine:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Otkazivanje narudzbine.
   *
   * Tekst zadatka: dugme "Otkazi" stoji "samo pored narudzbine za koju nije jos
   * zapoceta stampa i ima status naruceno". Uslov je zato deo samog upita, a ne
   * provera posle citanja - tako se ne moze otkazati narudzbina koja je u
   * medjuvremenu presla u stampu.
   *
   * Lager se VRACA. Kolicine su skinute pri zatvaranju narudzbine; ako do
   * stampe nikada nije doslo, proizvodi su i dalje u stampariji.
   */
  otkazi = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator narudžbine." });
        return;
      }

      const faktura = await Invoice.findOneAndUpdate(
        { _id: id, clientId: req.user!.id, status: "ORDERED" },
        { $set: { status: "CANCELLED", updatedAt: new Date() } },
        { new: true }
      );

      if (!faktura) {
        // Ista poruka i kada faktura ne postoji i kada je tudja - da se preko
        // ove rute ne moze saznati koje fakture postoje u sistemu.
        res.status(409).json({
          message:
            "Narudžbina se ne može otkazati. Otkazuje se samo narudžbina u statusu „naručeno“.",
        });
        return;
      }

      for (const stavka of faktura.items) {
        await Product.updateOne(
          { _id: stavka.productId },
          { $inc: { stock: stavka.quantity } }
        );
      }

      res.json({
        message: `Narudžbina ${faktura.number} je otkazana, a količine su vraćene na lager.`,
        invoice: faktura,
      });
    } catch (greska) {
      console.error("otkazi:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Klijent potvrdjuje prijem: isporuceno -> primljeno.
   *
   * Tekst zadatka, u odeljku o arhivi proizvoda: "u istoj listi nalaze se i
   * proizvodi sa statusom Isporuceno, koje klijent moze promeniti u status
   * Primljeno". To je jedini prelaz koji radi klijent, i tek posle njega sme
   * da ostavi ocenu i komentar.
   */
  potvrdiPrijem = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator narudžbine." });
        return;
      }

      const faktura = await Invoice.findOneAndUpdate(
        { _id: id, clientId: req.user!.id, status: "DELIVERED" },
        { $set: { status: "RECEIVED", updatedAt: new Date() } },
        { new: true }
      );

      if (!faktura) {
        res.status(409).json({
          message: "Prijem se potvrđuje samo za narudžbinu u statusu „isporučeno“.",
        });
        return;
      }

      res.json({ message: `Narudžbina ${faktura.number} je označena kao primljena.`, invoice: faktura });
    } catch (greska) {
      console.error("potvrdiPrijem:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Arhiva proizvoda.
   *
   * Tekst zadatka: klijent vidi "sve proizvode koji su dobijeni, odnosno koji su
   * u statusu Primljeno. U istoj listi nalaze se i proizvodi sa statusom
   * Isporuceno, koje klijent moze promeniti u status Primljeno."
   *
   * Zato je ovo spisak POJEDINACNIH PROIZVODA, a ne faktura: $unwind rastavlja
   * fakturu na njene stavke. Status i dalje stoji na fakturi - jedna stavka ga
   * nema svoj - pa se svakoj stavci pridruzuje status fakture na kojoj se
   * nalazi. To je tacno ono sto tekst i opisuje kada kaze da su proizvodi
   * "sortirani po datumu narucivanja (izdavanja fakture na kojoj se taj proizvod
   * nalazio)".
   *
   * Sortiranje: po datumu (podrazumevano), nazivu proizvoda, kolicini i
   * stampariji - sve cetiri nacina koje tekst nabraja.
   */
  arhiva = async (req: Request, res: Response): Promise<void> => {
    try {
      const poljeSortiranja =
        SORTIRANJE_ARHIVE[String(req.query.sort || "date")] ?? "invoiceDate";
      const smer: 1 | -1 = String(req.query.dir || "desc") === "asc" ? 1 : -1;

      const stavke = await Invoice.aggregate([
        {
          $match: {
            clientId: new Types.ObjectId(req.user!.id),
            status: { $in: ["DELIVERED", "RECEIVED"] },
          },
        },
        ...spojiUcesnike("printerId"),
        { $unwind: "$items" },
        {
          $project: {
            _id: 0,
            invoiceId: "$_id",
            invoiceNumber: "$number",
            invoiceStatus: "$status",
            invoiceDate: "$createdAt",
            printerName: 1,
            printerCity: 1,

            itemId: "$items._id",
            productId: "$items.productId",
            code: "$items.code",
            name: "$items.name",
            quantity: "$items.quantity",
            color: "$items.color",
            printType: "$items.printType",
            printText: "$items.printText",
            printImage: "$items.printImage",
            lineTotal: "$items.lineTotal",
          },
        },
        { $sort: { [poljeSortiranja]: smer } },
      ]).collation({ locale: "sr", strength: 1 });

      // Koje je od tih proizvoda klijent vec ocenio - da strana zna gde da
      // ponudi obrazac, a gde da prikaze postojecu ocenu.
      const ocene = await Rating.find({
        userId: req.user!.id,
        productId: { $in: stavke.map((s) => s.productId) },
      });

      const poProizvodu = new Map(
        ocene.map((o) => [
          String(o.productId),
          { value: o.value, comment: o.comment, updatedAt: o.updatedAt },
        ])
      );

      res.json(
        stavke.map((s) => ({
          ...s,
          // Oceniti se sme tek kada je proizvod PRIMLJEN.
          canRate: s.invoiceStatus === "RECEIVED",
          myRating: poProizvodu.get(String(s.productId)) ?? null,
        }))
      );
    } catch (greska) {
      console.error("arhiva:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Placanje jedne ili vise faktura.
   *
   * Tekst zadatka: "U e-korpi realizovati nakon pritiska na dugme POTVRDI
   * besplatan servis za placanje (...) gde klijent unosi podatke o tipu
   * kartice, broju kartice sa koje placa FAKTURU/FAKTURE, CVC kod kartice i
   * datum isticanja kartice (MM/GG). Takodje, izmedju naruceno i u stampi
   * dodaje se onda novi medju status placeno (...) ako nije, ispisuje se
   * poruka, i ponavlja se opet korak placanja."
   *
   * Zato se prima NIZ faktura: jedna kupovina iz korpe moze da napravi vise
   * faktura, a klijent ih placa jednom karticom, odjednom.
   *
   * Neuspeh NE menja nista - fakture ostaju u statusu "naruceno" i korak se
   * ponavlja, kako tekst i trazi.
   */
  plati = async (req: Request, res: Response): Promise<void> => {
    try {
      const identifikatori: string[] = Array.isArray(req.body.invoiceIds)
        ? req.body.invoiceIds.map(String)
        : [];

      if (!identifikatori.length) {
        res.status(400).json({ message: "Nije izabrana nijedna faktura za plaćanje." });
        return;
      }

      if (identifikatori.some((id) => !Types.ObjectId.isValid(id))) {
        res.status(400).json({ message: "Neispravan identifikator fakture." });
        return;
      }

      // Placaju se samo SVOJE fakture, i samo one koje jos nisu placene.
      const fakture = await Invoice.find({
        _id: { $in: identifikatori },
        clientId: req.user!.id,
        status: "ORDERED",
      });

      if (fakture.length !== identifikatori.length) {
        res.status(409).json({
          message:
            "Neke fakture nisu pronađene ili više nisu u statusu „naručeno“ — plaćaju se samo takve.",
        });
        return;
      }

      // Iznos se racuna PRE naplate, jer naplata treba da zna koliko skida.
      // Zbir svih izabranih faktura - tekst zadatka kaze "fakturu/fakture", pa
      // jedna kartica moze da plati vise njih odjednom.
      const iznos = fakture.reduce((zbir, f) => zbir + f.total, 0);

      // Ova ruta prima karticu samo u offline demonstracionom režimu. Kada
      // postoje Stripe ključevi, Angular koristi /payment-intent i Stripe
      // Elements, tako da broj i CVC ne mogu ni slučajno stići do servera.
      if (stripeJePodesen()) {
        res.status(409).json({
          message: "Stripe Test Mode je uključen. Plaćanje potvrdite kroz Stripe obrazac.",
        });
        return;
      }

      const ishod = naplatiLokalno({
        number: String(req.body.cardNumber ?? ""),
        cvc: String(req.body.cvc ?? ""),
        expiry: String(req.body.expiry ?? ""),
      });

      if (!ishod.uspesno) {
        // Ništa se ne menja. Klijent ponavlja korak plaćanja.
        res.status(402).json({ message: ishod.poruka });
        return;
      }

      const sada = new Date();

      for (const faktura of fakture) {
        faktura.status = "PAID";
        faktura.paidAt = sada;
        faktura.paymentBrand = ishod.brend;
        faktura.paymentLast4 = ishod.poslednje4;
        faktura.paymentRef = ishod.oznaka;
        faktura.updatedAt = sada;
        await faktura.save();
      }

      res.json({
        message:
          fakture.length === 1
            ? `Plaćanje je uspelo. Faktura ${fakture[0].number} je u statusu „plaćeno“.`
            : `Plaćanje je uspelo. ${fakture.length} fakture su u statusu „plaćeno“.`,
        paid: fakture.map((f) => ({ _id: f._id, number: f.number, total: f.total })),
        total: iznos,
        brand: ishod.brend,
        last4: ishod.poslednje4,
        reference: ishod.oznaka,
        // Koji nacin je odlucio: "stripe" ili "lokalno". Vraca se da se na
        // odbrani ne pogadja da li je poziv ka Stripe-u zaista otisao.
        engine: ishod.motor,
      });
    } catch (greska) {
      console.error("plati:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Pravi Stripe PaymentIntent iz faktura koje pripadaju prijavljenom klijentu. */
  zapocniStripePlacanje = async (req: Request, res: Response): Promise<void> => {
    try {
      const identifikatori: string[] = Array.isArray(req.body.invoiceIds)
        ? req.body.invoiceIds.map(String)
        : [];
      if (!identifikatori.length || identifikatori.some((id) => !Types.ObjectId.isValid(id))) {
        res.status(400).json({ message: "Izaberite ispravne fakture za plaćanje." });
        return;
      }

      // Bez ključeva aplikacija zadržava postojeću offline demonstraciju.
      if (!stripeJePodesen()) {
        res.json({ mode: "local" });
        return;
      }

      const fakture = await Invoice.find({
        _id: { $in: identifikatori }, clientId: req.user!.id, status: "ORDERED",
      });
      if (fakture.length !== identifikatori.length) {
        res.status(409).json({ message: "Neke fakture više nisu dostupne za plaćanje." });
        return;
      }

      const iznos = fakture.reduce((zbir, faktura) => zbir + faktura.total, 0);
      const intent = await napraviPaymentIntent(identifikatori, req.user!.id, iznos);
      res.json({ mode: "stripe", ...intent });
    } catch (greska) {
      console.error("zapocniStripePlacanje:", greska);
      res.status(502).json({ message: "Stripe nije mogao da započne plaćanje. Proverite test ključeve." });
    }
  };

  /**
   * Stripe.js je već potvrdio karticu. Server ponovo učitava PaymentIntent i
   * proverava njegov iznos, valutu, vlasnika i tačan skup faktura pre promene
   * statusa — clientSecret ili ID ne mogu da plate tuđe narudžbine.
   */
  potvrdiStripePlacanje = async (req: Request, res: Response): Promise<void> => {
    try {
      const identifikatori: string[] = Array.isArray(req.body.invoiceIds)
        ? req.body.invoiceIds.map(String)
        : [];
      const paymentIntentId = String(req.body.paymentIntentId ?? "");
      if (!paymentIntentId || !identifikatori.length || identifikatori.some((id) => !Types.ObjectId.isValid(id))) {
        res.status(400).json({ message: "Nedostaju podaci Stripe plaćanja." });
        return;
      }

      const fakture = await Invoice.find({
        _id: { $in: identifikatori }, clientId: req.user!.id, status: "ORDERED",
      });
      if (fakture.length !== identifikatori.length) {
        res.status(409).json({ message: "Neke fakture više nisu dostupne za plaćanje." });
        return;
      }

      const iznos = fakture.reduce((zbir, faktura) => zbir + faktura.total, 0);
      const ishod = await potvrdiPaymentIntent(paymentIntentId, identifikatori, req.user!.id, iznos);
      if (!ishod.uspesno) {
        res.status(402).json({ message: ishod.poruka });
        return;
      }

      const sada = new Date();
      for (const faktura of fakture) {
        faktura.status = "PAID";
        faktura.paidAt = sada;
        faktura.paymentBrand = ishod.brend;
        faktura.paymentLast4 = ishod.poslednje4;
        faktura.paymentRef = ishod.oznaka;
        faktura.updatedAt = sada;
        await faktura.save();
      }

      res.json({
        message: fakture.length === 1
          ? `Plaćanje je uspelo. Faktura ${fakture[0].number} je u statusu „plaćeno“.`
          : `Plaćanje je uspelo. ${fakture.length} fakture su u statusu „plaćeno“.`,
        paid: fakture.map((faktura) => ({ _id: faktura._id, number: faktura.number, total: faktura.total })),
        total: iznos, brand: ishod.brend, last4: ishod.poslednje4,
        reference: ishod.oznaka, engine: ishod.motor,
      });
    } catch (greska) {
      console.error("potvrdiStripePlacanje:", greska);
      res.status(502).json({ message: "Stripe potvrda nije uspela. Fakture nisu promenjene." });
    }
  };

  /**
   * PDF fakture.
   *
   * Vide je i klijent kojem je izdata i stamparija koja je izdaje - uslov je
   * deo upita, pa tudja faktura jednostavno nije pronadjena.
   *
   * Postoji nezavisno od slanja poste: posta trazi mrezu, a preuzimanje sa
   * strane radi uvek. Vidi utils/mail.ts.
   */
  pdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator narudžbine." });
        return;
      }

      const faktura = await Invoice.findOne({
        _id: id,
        $or: [{ clientId: req.user!.id }, { printerId: req.user!.id }],
      });

      if (!faktura) {
        res.status(404).json({ message: "Faktura nije pronađena." });
        return;
      }

      const bafer = await pdfFakture(faktura);

      res.setHeader("Content-Type", "application/pdf");
      // inline: faktura se otvara u pregledacu; "Sacuvaj kao" i dalje radi.
      res.setHeader("Content-Disposition", `inline; filename="${faktura.number}.pdf"`);
      res.send(bafer);
    } catch (greska) {
      console.error("pdf:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  // =========================================================================
  //  STAMPAR
  // =========================================================================

  /**
   * Naruceni proizvodi kod prijavljene stamparije.
   *
   * Uz svaku narudzbinu ide i ko je narucio - stamparu to treba da bi znao za
   * koga radi. Fakture nastale iz javne nabavke se prepoznaju po procurementId.
   */
  narudzbineStamparije = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = String(req.query.status || "").trim();

      const uslov: Record<string, unknown> = { printerId: new Types.ObjectId(req.user!.id) };
      if (status && SVI_STATUSI.includes(status as InvoiceStatus)) {
        uslov.status = status;
      }

      const fakture = await Invoice.aggregate([
        { $match: uslov },
        ...spojiUcesnike("clientId"),
        { $sort: redosled(req) },
      ]).collation({ locale: "sr", strength: 1 });

      res.json(fakture);
    } catch (greska) {
      console.error("narudzbineStamparije:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Stampar pomera status narudzbine UNAPRED, za tacno jedan korak.
   *
   * Tekst zadatka: "stampar ima samo privilegiju da prebaci status iz naruceno
   * u status u stampi, i nakon toga u status isporuceno". Dakle dva prelaza, i
   * oba samo unapred.
   *
   * Zasto se sledeci status racuna a ne prima iz zahteva: da klijent ne bi
   * poslao proizvoljan status i preskocio korak - na primer iz "naruceno"
   * pravo u "isporuceno", za posao koji nije ni odstampan.
   */
  pomeriStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator narudžbine." });
        return;
      }

      const faktura = await Invoice.findOne({ _id: id, printerId: req.user!.id });

      if (!faktura) {
        res.status(404).json({ message: "Narudžbina nije pronađena među vašim narudžbinama." });
        return;
      }

      const sledeci = SLEDECI_ZA_STAMPARA[faktura.status];

      if (!sledeci) {
        res.status(409).json({
          message:
            faktura.status === "CANCELLED"
              ? "Narudžbina je otkazana i njen status se više ne menja."
              : "Ovu narudžbinu štamparija više ne pomera — sledeći korak je na klijentu.",
        });
        return;
      }

      faktura.status = sledeci;
      faktura.updatedAt = new Date();
      await faktura.save();

      res.json({
        message: `Narudžbina ${faktura.number} je prebačena u status „${NAZIVI[sledeci]}".`,
        invoice: faktura,
      });
    } catch (greska) {
      console.error("pomeriStatus:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}

/**
 * Sastavlja PDF jedne fakture: ucitava ucesnike i preda ih generatoru.
 * Izvezeno jer ga koristi i ruta za preuzimanje i slanje poste pri zatvaranju
 * narudzbine, pa da se ucitavanje ne pise na dva mesta.
 */
export async function pdfFakture(faktura: IInvoice): Promise<Buffer> {
  const [klijent, stampar] = await Promise.all([
    User.findById(faktura.clientId),
    User.findById(faktura.printerId),
  ]);

  return fakturaUPdf({
    faktura,
    klijent: {
      firstName: klijent?.firstName ?? "",
      lastName: klijent?.lastName ?? "",
      email: klijent?.email ?? "",
      institution: klijent?.institution,
    },
    stampar: { institution: stampar?.institution },
  });
}

/**
 * Salje izdatu fakturu klijentu na i-mejl, kao PDF prilog.
 *
 * Tekst zadatka: "Nakon formiranja, fakturu/e dostaviti kao PDF fajl(ove)
 * klijentu na i-mejl."
 *
 * NIKADA ne baca: faktura je vec izdata i lager skinut, pa neuspelo slanje ne
 * sme da obori posao koji je uspeo. Vraca ishod, da strana moze da kaze
 * korisniku sta se desilo.
 */
export async function posaljiFakturuNaMejl(faktura: IInvoice) {
  const klijent = await User.findById(faktura.clientId);
  if (!klijent) return { sent: false, reason: "Klijent nije pronađen." };

  const bafer = await pdfFakture(faktura);

  return posalji(
    klijent.email,
    `Faktura ${faktura.number} — Printing House`,
    `Poštovani,\n\n` +
      `u prilogu se nalazi faktura ${faktura.number} na iznos od ${faktura.total} RSD.\n` +
      `Narudžbina je evidentirana i nalazi se u statusu „naručeno“.\n\n` +
      `Printing House`,
    [
      {
        filename: `${faktura.number}.pdf`,
        content: bafer,
        contentType: "application/pdf",
      },
    ]
  );
}

const SVI_STATUSI: InvoiceStatus[] = [...SEKVENCA_STATUSA, "CANCELLED"];

/**
 * Po cemu sme da se sortira arhiva proizvoda.
 * Tekst zadatka nabraja bas ova cetiri nacina.
 */
const SORTIRANJE_ARHIVE: Record<string, string> = {
  date: "invoiceDate",
  name: "name",
  quantity: "quantity",
  printer: "printerName",
};

/**
 * Prelazi koje sme da uradi STAMPAR, i samo on.
 *
 * PAID nema svoj red jer se pojavljuje tek ako se realizuje deo sa placanjem;
 * kada se pojavi, ponasa se kao ORDERED - stampar iz njega ide u PRINTING.
 * DELIVERED nema sledeci korak za stampara: prijem potvrdjuje klijent.
 */
const SLEDECI_ZA_STAMPARA: Partial<Record<InvoiceStatus, InvoiceStatus>> = {
  ORDERED: "PRINTING",
  PAID: "PRINTING",
  PRINTING: "DELIVERED",
};

const NAZIVI: Record<InvoiceStatus, string> = {
  ORDERED: "naručeno",
  PAID: "plaćeno",
  PRINTING: "u štampi",
  DELIVERED: "isporučeno",
  RECEIVED: "primljeno",
  CANCELLED: "otkazano",
};
