import { Request, Response } from "express";
import { Types } from "mongoose";
import path from "path";
import { obrisiFajl } from "../middleware/upload.middleware";
import Cart, { ICartItem } from "../models/Cart";
import { sledeciBrojFakture } from "../models/Counter";
import Invoice from "../models/Invoice";
import Product, { IPrintService, IProduct } from "../models/Product";
import { uBroj } from "../utils/validation";
import { posaljiFakturuNaMejl } from "./invoice.controller";
import { raspisiIzKorpe } from "./procurement.controller";

/** Proizvod u korpi, sa ucitanim stamparom. */
type ProizvodSaStamparom = IProduct & {
  printerId: { _id: Types.ObjectId; institution?: { name?: string; city?: string } };
};

const POLJA_STAMPARA = "institution.name institution.city";

/**
 * Procenat iz tela zahteva, sveden u dozvoljene granice.
 *
 * Polozaj i velicina otiska stizu sa strane za pripremu, gde ih klijent
 * podesava misem. Klijentu se ne veruje ni za tip ni za opseg: vrednost izvan
 * granica bi u korpi i na fakturi izmestila otisak van slike.
 */
function uProcenat(vrednost: unknown, podrazumevano: number, najmanje = 0): number {
  const broj = Number(vrednost);
  if (!Number.isFinite(broj)) return podrazumevano;
  return Math.min(100, Math.max(najmanje, broj));
}

/**
 * Jedna stavka korpe, spremna za prikaz i za racunanje.
 * Cene se racunaju iz PROIZVODA, ne iz korpe - vidi model Cart.
 */
function spremiStavku(stavka: ICartItem, proizvod: ProizvodSaStamparom) {
  const usluga = stavka.printServiceId
    ? proizvod.printServices.find((u) => String(u._id) === String(stavka.printServiceId))
    : undefined;

  const dodatna = usluga?.extraPricePerPiece ?? 0;
  const poKomadu = proizvod.unitPrice + dodatna;

  return {
    _id: stavka._id,
    productId: proizvod._id,
    code: proizvod.code,
    name: proizvod.name,
    categoryName: proizvod.categoryName,
    subcategoryName: proizvod.subcategoryName,
    mainImage: proizvod.mainImage,

    printerId: proizvod.printerId?._id,
    printerName: proizvod.printerId?.institution?.name ?? "",
    printerCity: proizvod.printerId?.institution?.city ?? "",

    quantity: stavka.quantity,
    color: stavka.color,
    unitPrice: proizvod.unitPrice,

    printServiceId: stavka.printServiceId,
    printType: usluga?.printType ?? "",
    extraPricePerPiece: dodatna,

    printText: stavka.printText,
    printImage: stavka.printImage,
    printX: stavka.printX,
    printY: stavka.printY,
    printScale: stavka.printScale,

    // Ukupna cena za taj proizvod - trazi je tekst zadatka u prikazu e-korpe.
    lineTotal: poKomadu * stavka.quantity,

    /** Trenutno stanje na lageru - da se vidi ako je u medjuvremenu palo. */
    stock: proizvod.stock,
    /** Ima li dovoljno da se ova stavka realizuje. */
    available: proizvod.stock >= stavka.quantity,
  };
}

type SpremnaStavka = ReturnType<typeof spremiStavku>;

interface GrupaStamparije {
  printerId: Types.ObjectId;
  printerName: string;
  printerCity: string;
  items: SpremnaStavka[];
  total: number;
}

/** Stavke grupisane po stampariji - tekst zadatka trazi bas takav prikaz. */
function grupisiPoStamparijama(stavke: SpremnaStavka[]): GrupaStamparije[] {
  const grupe = new Map<string, GrupaStamparije>();

  for (const stavka of stavke) {
    const kljuc = String(stavka.printerId);

    if (!grupe.has(kljuc)) {
      grupe.set(kljuc, {
        printerId: stavka.printerId,
        printerName: stavka.printerName,
        printerCity: stavka.printerCity,
        items: [],
        total: 0,
      });
    }

    const grupa = grupe.get(kljuc)!;
    grupa.items.push(stavka);
    grupa.total += stavka.lineTotal;
  }

  return [...grupe.values()].sort((a, b) => a.printerName.localeCompare(b.printerName, "sr"));
}

export class CartController {
  /**
   * Ucitava korpu prijavljenog klijenta zajedno sa proizvodima.
   *
   * Stavke ciji proizvod vise ne postoji (stamparija obrisana) ispadaju, i
   * korpa se odmah snima bez njih - inace bi zauvek nosila mrtve stavke.
   */
  private async ucitajKorpu(clientId: string) {
    const korpa =
      (await Cart.findOne({ clientId })) ?? (await Cart.create({ clientId, items: [] }));

    const proizvodi = await Product.find({
      _id: { $in: korpa.items.map((s) => s.productId) },
    }).populate("printerId", POLJA_STAMPARA);

    const poId = new Map(proizvodi.map((p) => [String(p._id), p as ProizvodSaStamparom]));

    const zive = korpa.items.filter((s) => poId.has(String(s.productId)));

    if (zive.length !== korpa.items.length) {
      korpa.items.splice(0, korpa.items.length, ...zive);
      korpa.updatedAt = new Date();
      await korpa.save();
    }

    const stavke = korpa.items.map((s) => spremiStavku(s, poId.get(String(s.productId))!));

    return { korpa, stavke };
  }

  private odgovorKorpe(stavke: SpremnaStavka[]) {
    return {
      groups: grupisiPoStamparijama(stavke),
      itemCount: stavke.length,
      total: stavke.reduce((zbir, s) => zbir + s.lineTotal, 0),
      /** Broj faktura koje bi nastale - jedna po stampariji. */
      invoiceCount: new Set(stavke.map((s) => String(s.printerId))).size,
    };
  }

  /** Trenutna e-korpa, grupisana po stamparijama. */
  korpa = async (req: Request, res: Response): Promise<void> => {
    try {
      const { stavke } = await this.ucitajKorpu(req.user!.id);
      res.json(this.odgovorKorpe(stavke));
    } catch (greska) {
      console.error("korpa:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Dodavanje proizvoda u korpu, sa pripremom stampe.
   *
   * Zahtev moze da nosi slicicu za stampu, pa ide kao multipart/form-data.
   */
  dodaj = async (req: Request, res: Response): Promise<void> => {
    const putanjaSlike = req.file?.path;

    try {
      const productId = String(req.body.productId ?? "");
      const kolicina = uBroj(req.body.quantity, 0);

      if (!Types.ObjectId.isValid(productId)) {
        obrisiFajl(putanjaSlike);
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      if (!Number.isInteger(kolicina) || kolicina < 1) {
        obrisiFajl(putanjaSlike);
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "quantity", message: "Količina mora biti ceo broj veći od nule." }],
        });
        return;
      }

      const proizvod = await Product.findById(productId);
      if (!proizvod) {
        obrisiFajl(putanjaSlike);
        res.status(404).json({ message: "Proizvod nije pronađen." });
        return;
      }

      // Tekst zadatka trazi bas ovu poruku, doslovno.
      if (proizvod.stock < kolicina) {
        obrisiFajl(putanjaSlike);
        res.status(409).json({ message: "Nema dovoljno proizvoda trenutno na stanju." });
        return;
      }

      // Usluga stampe mora pripadati BAS ovom proizvodu - inace bi klijent
      // mogao da zalepi jeftinu uslugu sa drugog proizvoda.
      const uslugaId = String(req.body.printServiceId ?? "").trim();
      let usluga: IPrintService | undefined;

      if (uslugaId) {
        usluga = proizvod.printServices.find((u) => String(u._id) === uslugaId);
        if (!usluga) {
          obrisiFajl(putanjaSlike);
          res.status(400).json({
            message: "Podaci nisu ispravni.",
            errors: [
              { field: "printServiceId", message: "Izabrana usluga ne postoji za ovaj proizvod." },
            ],
          });
          return;
        }
      }

      // Ista logika kao na strani sa detaljima: ako proizvod nema boje, vazi bela.
      const boja = String(req.body.color ?? "").trim();
      if (boja && !proizvod.availableColors.includes(boja)) {
        obrisiFajl(putanjaSlike);
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "color", message: "Izabrana boja nije dostupna za ovaj proizvod." }],
        });
        return;
      }

      const korpa =
        (await Cart.findOne({ clientId: req.user!.id })) ??
        (await Cart.create({ clientId: req.user!.id, items: [] }));

      korpa.items.push({
        _id: new Types.ObjectId(),
        productId: proizvod._id as Types.ObjectId,
        quantity: kolicina,
        color: boja || proizvod.availableColors[0] || "Bela",
        printServiceId: usluga?._id,
        printText: String(req.body.printText ?? "").trim(),
        printImage: req.file ? "print/" + req.file.filename : "",
        printX: uProcenat(req.body.printX, 50),
        printY: uProcenat(req.body.printY, 50),
        printScale: uProcenat(req.body.printScale, 46, 5),
        addedAt: new Date(),
      });

      korpa.updatedAt = new Date();
      await korpa.save();

      const { stavke } = await this.ucitajKorpu(req.user!.id);

      res.status(201).json({
        message: `„${proizvod.name}" je dodat u korpu.`,
        cart: this.odgovorKorpe(stavke),
      });
    } catch (greska) {
      obrisiFajl(putanjaSlike);
      console.error("dodaj:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Promena kolicine jedne stavke. */
  promeniKolicinu = async (req: Request, res: Response): Promise<void> => {
    try {
      const stavkaId = String(req.params.id);
      const kolicina = uBroj(req.body.quantity, 0);

      if (!Number.isInteger(kolicina) || kolicina < 1) {
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "quantity", message: "Količina mora biti ceo broj veći od nule." }],
        });
        return;
      }

      const korpa = await Cart.findOne({ clientId: req.user!.id });
      const stavka = korpa?.items.id(stavkaId);

      if (!korpa || !stavka) {
        res.status(404).json({ message: "Stavka nije pronađena u korpi." });
        return;
      }

      const proizvod = await Product.findById(stavka.productId);
      if (!proizvod || proizvod.stock < kolicina) {
        res.status(409).json({ message: "Nema dovoljno proizvoda trenutno na stanju." });
        return;
      }

      stavka.quantity = kolicina;
      korpa.updatedAt = new Date();
      await korpa.save();

      const { stavke } = await this.ucitajKorpu(req.user!.id);
      res.json({ message: "Količina je izmenjena.", cart: this.odgovorKorpe(stavke) });
    } catch (greska) {
      console.error("promeniKolicinu:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Izbacivanje jedne stavke iz korpe. */
  izbaci = async (req: Request, res: Response): Promise<void> => {
    try {
      const stavkaId = String(req.params.id);

      const korpa = await Cart.findOne({ clientId: req.user!.id });
      const stavka = korpa?.items.id(stavkaId);

      if (!korpa || !stavka) {
        res.status(404).json({ message: "Stavka nije pronađena u korpi." });
        return;
      }

      // Slicica za stampu pripada samo ovoj stavci, pa odlazi s njom.
      if (stavka.printImage) {
        obrisiFajl(putanjaOtpreme(stavka.printImage));
      }

      stavka.deleteOne();
      korpa.updatedAt = new Date();
      await korpa.save();

      const { stavke } = await this.ucitajKorpu(req.user!.id);
      res.json({ message: "Stavka je izbačena iz korpe.", cart: this.odgovorKorpe(stavke) });
    } catch (greska) {
      console.error("izbaci:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Pražnjenje cele korpe. */
  isprazni = async (req: Request, res: Response): Promise<void> => {
    try {
      const korpa = await Cart.findOne({ clientId: req.user!.id });

      if (korpa) {
        for (const stavka of korpa.items) {
          if (stavka.printImage) obrisiFajl(putanjaOtpreme(stavka.printImage));
        }
        korpa.items.splice(0, korpa.items.length);
        korpa.updatedAt = new Date();
        await korpa.save();
      }

      res.json({ message: "Korpa je ispražnjena.", cart: this.odgovorKorpe([]) });
    } catch (greska) {
      console.error("isprazni:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Zatvaranje narudzbine - dugme POTVRDI.
   *
   * Tekst zadatka: "ako su odabrani proizvodi iz 3 razlicite stamparije,
   * sistem ce evidentirati 3 razlicite fakture". Zato se stavke grupisu po
   * stampariji, i za svaku grupu nastaje po jedna faktura.
   *
   * ================== ATOMICNOST ==================
   *
   * Prva verzija projekta je lager PROVERAVALA u jednoj petlji, pa ga
   * UMANJIVALA u drugoj. Izmedju te dve petlje neko drugi moze da kupi
   * poslednji komad, i lager ode u minus.
   *
   * Ovde je provera i umanjenje JEDNA operacija:
   *
   *   findOneAndUpdate({ _id, stock: { $gte: q } }, { $inc: { stock: -q } })
   *
   * Uslov stock >= q je deo upita, pa baza garantuje da ce se umanjiti samo
   * ako stvarno ima dovoljno. Kada vrati null, znaci da nije bilo dovoljno -
   * i to je jedini pouzdan nacin da se to sazna.
   *
   * ================== VRACANJE UNAZAD ==================
   *
   * MongoDB podrzava transakcije samo u replica set rezimu, a ovde radi kao
   * samostalna instanca. Zato se, ako neka stavka padne, vec skinute kolicine
   * vracaju obrnutim $inc-om. To nije prava transakcija - ali je jedino sto
   * stoji na raspolaganju, i pokriva slucaj zbog kojeg i postoji: da klijentu
   * ne ostane skinut lager za narudzbinu koja nije nastala.
   */
  zatvoriNarudzbinu = async (req: Request, res: Response): Promise<void> => {
    // Sta je skinuto do sada - da se vrati ako nesto padne.
    const skinuto: { productId: Types.ObjectId; quantity: number }[] = [];

    try {
      const { korpa, stavke } = await this.ucitajKorpu(req.user!.id);

      if (!stavke.length) {
        res.status(400).json({ message: "Korpa je prazna." });
        return;
      }

      /*
       * Pravno lice iz korpe NE dobija fakture nego raspisuje javnu nabavku.
       *
       * Tekst zadatka: "za razliku od klijenta - fizickog lica, u trenutku
       * potvrdjivanja iz E-korpi, ne formiraju se fakture, vec se formira poziv
       * za podnosenje ponuda stamparijama i licitiranje".
       *
       * Lager se ovde NE skida: nista jos nije naruceno. Skida se tek pobedniku
       * licitacije, pri zakljucivanju - vidi procurement.controller.
       */
      if (req.user!.type === "CLIENT_COMPANY") {
        const nabavka = await raspisiIzKorpe(
          req.user!.id,
          stavke.map((s) => ({
            productId: s.productId,
            name: s.name,
            categoryName: s.categoryName,
            subcategoryName: s.subcategoryName,
            quantity: s.quantity,
          }))
        );

        korpa.items.splice(0, korpa.items.length);
        korpa.updatedAt = new Date();
        await korpa.save();

        res.status(201).json({
          message:
            `Javna nabavka ${nabavka.number} je raspisana. ` +
            `Štamparije mogu da šalju ponude narednih 10 minuta.`,
          procurement: {
            _id: nabavka._id,
            number: nabavka.number,
            deadline: nabavka.deadline,
            itemCount: nabavka.items.length,
          },
          invoices: [],
        });
        return;
      }

      // --- 1. skidanje lagera, atomicno po stavci ---------------------------
      for (const stavka of stavke) {
        const ishod = await Product.findOneAndUpdate(
          { _id: stavka.productId, stock: { $gte: stavka.quantity } },
          { $inc: { stock: -stavka.quantity } }
        );

        if (!ishod) {
          await vratiLager(skinuto);
          res.status(409).json({
            message: `Nema dovoljno proizvoda trenutno na stanju: „${stavka.name}".`,
          });
          return;
        }

        skinuto.push({
          productId: stavka.productId as Types.ObjectId,
          quantity: stavka.quantity,
        });
      }

      // --- 2. po jedna faktura za svaku stampariju --------------------------
      const grupe = grupisiPoStamparijama(stavke);
      const fakture: {
        _id: unknown;
        number: string;
        printerName: string;
        printerCity: string;
        total: number;
        itemCount: number;
        mailSent: boolean;
        mailPreviewUrl?: string;
      }[] = [];

      for (const grupa of grupe) {
        // Broj se uzima atomicno - vidi model Counter.
        const broj = await sledeciBrojFakture();

        const faktura = await Invoice.create({
          number: broj,
          clientId: req.user!.id,
          printerId: grupa.printerId,
          // Sve se PREPISUJE: faktura je istorijski zapis, ne pogled na
          // proizvod. Vidi model Invoice.
          items: grupa.items.map((s) => ({
            _id: new Types.ObjectId(),
            productId: s.productId,
            code: s.code,
            name: s.name,
            unitPrice: s.unitPrice,
            quantity: s.quantity,
            color: s.color,
            printType: s.printType,
            extraPricePerPiece: s.extraPricePerPiece,
            printText: s.printText,
            printImage: s.printImage,
            printX: s.printX,
            printY: s.printY,
            printScale: s.printScale,
            lineTotal: s.lineTotal,
          })),
          total: grupa.total,
          status: "ORDERED",
        });

        /*
         * Tekst zadatka: "Nakon formiranja, fakturu/e dostaviti kao PDF fajl(ove)
         * klijentu na i-mejl."
         *
         * Slanje NE sme da obori zatvaranje narudzbine: lager je vec skinut i
         * faktura izdata. Zato posaljiFakturuNaMejl nikada ne baca, nego vraca
         * ishod - a strana ga prikaze. PDF se u svakom slucaju moze preuzeti sa
         * strane, pa demonstracija radi i bez mreze.
         */
        const posta = await posaljiFakturuNaMejl(faktura);

        fakture.push({
          _id: faktura._id,
          number: faktura.number,
          printerName: grupa.printerName,
          printerCity: grupa.printerCity,
          total: faktura.total,
          itemCount: faktura.items.length,
          mailSent: posta.sent,
          mailPreviewUrl: posta.previewUrl,
        });
      }

      // --- 3. korpa se prazni ----------------------------------------------
      // Slicice za stampu se NE brisu: prenete su na fakturu i od sada su njen
      // podatak. Brisanje bi obesmislilo vec izdatu fakturu.
      korpa.items.splice(0, korpa.items.length);
      korpa.updatedAt = new Date();
      await korpa.save();

      res.status(201).json({
        message:
          fakture.length === 1
            ? `Narudžbina je evidentirana. Broj fakture: ${fakture[0].number}.`
            : `Narudžbina je evidentirana kroz ${fakture.length} fakture, po jednu za svaku štampariju.`,
        invoices: fakture,
      });
    } catch (greska) {
      await vratiLager(skinuto);
      console.error("zatvoriNarudzbinu:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}

/** Vraca na lager kolicine skinute pre nego sto je zatvaranje palo. */
async function vratiLager(skinuto: { productId: Types.ObjectId; quantity: number }[]) {
  for (const stavka of skinuto) {
    try {
      await Product.updateOne({ _id: stavka.productId }, { $inc: { stock: stavka.quantity } });
    } catch (greska) {
      // Ako i vracanje padne, zapisujemo - ali ne rusimo odgovor klijentu,
      // koji ionako dobija poruku da narudzbina nije prosla.
      console.error("vratiLager:", greska);
    }
  }
}

/** Puna putanja do otpremljenog fajla, iz putanje kakva se cuva u bazi. */
function putanjaOtpreme(relativna: string): string {
  return path.join(__dirname, "..", "..", "uploads", relativna);
}
