import { Request, Response } from "express";
import { Types } from "mongoose";
import path from "path";
import { obrisiFajl } from "../middleware/upload.middleware";
import Category from "../models/Category";
import Product from "../models/Product";
import Rating from "../models/Rating";
import { pungProizvod } from "../utils/mappers";
import { Provera, uBroj, zaRegex } from "../utils/validation";

/** Najveci broj dodatnih slika u galeriji - tekst zadatka: "najvise tri". */
const NAJVISE_DODATNIH = 3;

const KOREN_OTPREME = path.join(__dirname, "..", "..", "uploads");

/**
 * Polja stampara koja se ucitavaju uz proizvod.
 *
 * Na jednom mestu jer ih trazi svaka ruta koja vraca proizvod: bez ovoga
 * pungProizvod dobija goli identifikator umesto korisnika, pa naziv i grad
 * stamparije izadju kao prazan tekst. Ucitavaju se samo ova polja - mejl,
 * telefon i PIB stampara nemaju sta da trazi uz proizvod.
 */
const POLJA_STAMPARA =
  "institution.name institution.city institution.address institution.lat institution.lng";

/** Slike koje stizu kroz multer .fields(...), grupisane po imenu polja. */
type PoslateSlike = Record<string, Express.Multer.File[]> | undefined;

function sveSlike(fajlovi: PoslateSlike): Express.Multer.File[] {
  if (!fajlovi) return [];
  return Object.values(fajlovi).flat();
}

/** Brise sve primljene slike - poziva se kada zahtev padne na nekoj proveri. */
function obrisiPoslate(fajlovi: PoslateSlike): void {
  for (const fajl of sveSlike(fajlovi)) obrisiFajl(fajl.path);
}

/**
 * Usluge stampe stizu kao JSON tekst unutar multipart forme.
 *
 * Razlog: zahtev nosi i slike, pa mora biti multipart/form-data, a taj format
 * poznaje samo polja i fajlove - ne i ugnjezdene nizove objekata. Zato ih
 * klijent pakuje u JSON, a server ovde raspakuje i proverava.
 */
function procitajUsluge(tekst: unknown): { usluge: unknown[]; greska?: string } {
  if (tekst === undefined || String(tekst).trim() === "") return { usluge: [] };

  try {
    const raspakovano = JSON.parse(String(tekst));
    if (!Array.isArray(raspakovano)) {
      return { usluge: [], greska: "Usluge štampe nisu u ispravnom obliku." };
    }
    return { usluge: raspakovano };
  } catch {
    return { usluge: [], greska: "Usluge štampe nisu u ispravnom obliku." };
  }
}

/** Jedna usluga stampe, prevedena iz onoga sto je stiglo sa forme ili iz fajla. */
function napraviUslugu(sirovo: Record<string, unknown>) {
  return {
    _id: new Types.ObjectId(),
    code: String(sirovo.code ?? sirovo.idUsluge ?? "").trim(),
    printType: String(sirovo.printType ?? sirovo.tipStampe ?? "").trim(),
    extraPricePerPiece: uBroj(sirovo.extraPricePerPiece ?? sirovo.dodatnaCenaPoKomadu),
    maxWidthMm: uBroj(sirovo.maxWidthMm ?? sirovo.maxSirinaMm),
    maxHeightMm: uBroj(sirovo.maxHeightMm ?? sirovo.maxVisinaMm),
  };
}

export class ProductController {
  // =========================================================================
  //  STAMPAR - svoji proizvodi
  // =========================================================================

  /**
   * Proizvodi prijavljene stamparije.
   *
   * printerId se uzima IZ TOKENA, nikada iz zahteva. Da se citao iz upita,
   * jedan stampar bi mogao da vidi i menja lager liste svih ostalih.
   */
  mojiProizvodi = async (req: Request, res: Response): Promise<void> => {
    try {
      const proizvodi = await Product.find({ printerId: req.user!.id })
        .collation({ locale: "sr", strength: 1 })
        .sort({ name: 1 })
        .populate("printerId", POLJA_STAMPARA);

      res.json(proizvodi.map(pungProizvod));
    } catch (greska) {
      console.error("mojiProizvodi:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Dodavanje novog proizvoda, sa glavnom slikom i galerijom. */
  dodajProizvod = async (req: Request, res: Response): Promise<void> => {
    const fajlovi = req.files as PoslateSlike;

    try {
      const { code, name, description, categoryName, subcategoryName } = req.body;
      const cena = uBroj(req.body.unitPrice, -1);
      const zalihe = uBroj(req.body.stock, -1);

      const provera = new Provera()
        .obavezno("code", code, "Šifra proizvoda")
        .obavezno("name", name, "Naziv proizvoda")
        .obavezno("categoryName", categoryName, "Kategorija")
        .uslov("unitPrice", cena >= 0, "Jedinična cena mora biti broj koji nije negativan.")
        .uslov("stock", zalihe >= 0, "Količina na lageru mora biti broj koji nije negativan.");

      const { usluge, greska: greskaUsluga } = procitajUsluge(req.body.printServices);
      if (greskaUsluga) provera.uslov("printServices", false, greskaUsluga);

      if (!provera.ispravno) {
        obrisiPoslate(fajlovi);
        res.status(400).json({ message: "Podaci nisu ispravni.", errors: provera.greske });
        return;
      }

      // Kategorija mora vec postojati - tekst zadatka: proizvodi se dodaju "u
      // vec predefinisane kategorije i potkategorije iz baze podataka".
      const kategorija = await Category.findOne({ name: String(categoryName).trim() }).collation({
        locale: "sr",
        strength: 1,
      });

      if (!kategorija) {
        obrisiPoslate(fajlovi);
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "categoryName", message: "Izabrana kategorija ne postoji." }],
        });
        return;
      }

      // Provera unapred, radi razumljive poruke. Garanciju daje jedinstveni
      // indeks (printerId + code) iz seed skripta.
      if (await Product.exists({ printerId: req.user!.id, code: String(code).trim() })) {
        obrisiPoslate(fajlovi);
        res.status(409).json({
          message: "Šifra je već u upotrebi.",
          errors: [{ field: "code", message: "Već imate proizvod sa ovom šifrom." }],
        });
        return;
      }

      const glavna = fajlovi?.["mainImage"]?.[0];
      const dodatne = (fajlovi?.["additionalImages"] ?? []).slice(0, NAJVISE_DODATNIH);

      const proizvod = await Product.create({
        printerId: req.user!.id,
        code: String(code).trim(),
        name: String(name).trim(),
        description: String(description ?? "").trim(),
        categoryId: kategorija._id,
        categoryName: kategorija.name,
        subcategoryName: String(subcategoryName ?? "").trim(),
        unitPrice: cena,
        stock: zalihe,
        availableColors: this.procitajBoje(req.body.availableColors),
        mainImage: glavna ? "product/" + glavna.filename : "default_product_image.svg",
        additionalImages: dodatne.map((f) => "product/" + f.filename),
        printServices: usluge.map((u) => napraviUslugu(u as Record<string, unknown>)),
      });

      // create() vraca dokument u kojem je printerId goli identifikator, pa se
      // stampar ucitava naknadno - inace bi naziv stamparije stigao kao prazan.
      await proizvod.populate("printerId", POLJA_STAMPARA);

      res.status(201).json({
        message: `Proizvod "${proizvod.name}" je dodat.`,
        product: pungProizvod(proizvod),
      });
    } catch (greska) {
      obrisiPoslate(fajlovi);
      console.error("dodajProizvod:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Boje stizu kao tekst razdvojen zarezima ("Bela, Crna, Siva").
   * Ako nijedna nije uneta, tekst zadatka kaze da vazi podrazumevana bela.
   */
  private procitajBoje(sirovo: unknown): string[] {
    const boje = String(sirovo ?? "")
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b !== "");

    return boje.length ? boje : ["Bela"];
  }

  /**
   * Promena kolicine na lageru.
   *
   * Uslov { printerId } u samom upitu, a ne provera posle citanja: tako
   * stampar ne moze da promeni zalihe tudjeg proizvoda ni kada posalje
   * njegov identifikator.
   */
  azurirajZalihe = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const zalihe = uBroj(req.body.stock, -1);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      if (zalihe < 0 || !Number.isInteger(zalihe)) {
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "stock", message: "Količina mora biti ceo broj koji nije negativan." }],
        });
        return;
      }

      const proizvod = await Product.findOneAndUpdate(
        { _id: id, printerId: req.user!.id },
        { $set: { stock: zalihe } },
        { new: true }
      ).populate("printerId", POLJA_STAMPARA);

      if (!proizvod) {
        res.status(404).json({ message: "Proizvod nije pronađen među vašim proizvodima." });
        return;
      }

      res.json({
        message: `Količina za "${proizvod.name}" je postavljena na ${zalihe}.`,
        product: pungProizvod(proizvod),
      });
    } catch (greska) {
      console.error("azurirajZalihe:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Dodavanje slika postojecem proizvodu.
   *
   * Ovo je drugi korak uvoza iz JSON fajla: fajl donosi podatke, a slike se po
   * tekstu zadatka moraju uneti kroz FileUpload, pa se dodaju ovde. Ista ruta
   * sluzi i za naknadnu izmenu galerije rucno unetog proizvoda.
   */
  dodajSlike = async (req: Request, res: Response): Promise<void> => {
    const fajlovi = req.files as PoslateSlike;

    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        obrisiPoslate(fajlovi);
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      const proizvod = await Product.findOne({ _id: id, printerId: req.user!.id });

      if (!proizvod) {
        obrisiPoslate(fajlovi);
        res.status(404).json({ message: "Proizvod nije pronađen među vašim proizvodima." });
        return;
      }

      const glavna = fajlovi?.["mainImage"]?.[0];
      const dodatne = fajlovi?.["additionalImages"] ?? [];

      if (!glavna && !dodatne.length) {
        res.status(400).json({ message: "Niste izabrali nijednu sliku." });
        return;
      }

      if (glavna) {
        const stara = proizvod.mainImage;
        proizvod.mainImage = "product/" + glavna.filename;

        // Uzorci iz seed skripta i podrazumevana slika su zajednicki - njih ne
        // brisemo, jer ih moze koristiti i neki drugi proizvod.
        if (stara && stara !== "default_product_image.svg" && !stara.includes("/pr-")) {
          obrisiFajl(path.join(KOREN_OTPREME, stara));
        }
      }

      for (const fajl of dodatne) {
        if (proizvod.additionalImages.length >= NAJVISE_DODATNIH) {
          // Visak se ne cuva u bazi, pa ne sme ostati ni na disku.
          obrisiFajl(fajl.path);
          continue;
        }
        proizvod.additionalImages.push("product/" + fajl.filename);
      }

      await proizvod.save();
      await proizvod.populate("printerId", POLJA_STAMPARA);

      res.json({
        message: `Slike za "${proizvod.name}" su sačuvane.`,
        product: pungProizvod(proizvod),
      });
    } catch (greska) {
      obrisiPoslate(fajlovi);
      console.error("dodajSlike:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Uvoz lager liste iz JSON fajla (Prilog 1 teksta zadatka).
   *
   * Dve odluke koje se ne vide iz koda:
   *
   * 1) Polja "stampaorijaId" i "nazivStamparije" iz fajla se NE koriste.
   *    Proizvodi se uvek upisuju prijavljenoj stampariji. Da se verovalo
   *    fajlu, jedan stampar bi uvozom mogao da upise proizvode drugom.
   *
   * 2) Polja "slikaUrl" i "dodatneSlike" se takodje NE koriste. Tekst zadatka
   *    izricito zabranjuje unos slike "putem eksternog linka do slike na
   *    drugoj lokaciji". Uvezeni proizvodi zato dobijaju podrazumevanu sliku,
   *    a prave se dodaju u sledecem koraku, kroz FileUpload.
   *
   * Fajl se obradjuje red po red: jedan neispravan proizvod ne rusi ceo uvoz,
   * nego se preskace i pojavljuje u izvestaju.
   */
  uveziIzFajla = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "Niste izabrali JSON fajl." });
        return;
      }

      let sadrzaj: { proizvodi?: unknown[] };
      try {
        sadrzaj = JSON.parse(req.file.buffer.toString("utf8"));
      } catch {
        res.status(400).json({ message: "Fajl nije ispravan JSON dokument." });
        return;
      }

      const redovi = Array.isArray(sadrzaj?.proizvodi) ? sadrzaj.proizvodi : null;

      if (!redovi) {
        res.status(400).json({
          message: 'Fajl ne sadrži listu "proizvodi". Očekuje se format iz Priloga 1.',
        });
        return;
      }

      if (!redovi.length) {
        res.status(400).json({ message: "Lista proizvoda u fajlu je prazna." });
        return;
      }

      // Kategorije se ucitavaju jednom, pa se poredi u memoriji - inace bi za
      // svaki red isao poseban upit ka bazi.
      const kategorije = await Category.find();
      const poNazivu = new Map(kategorije.map((k) => [k.name.toLocaleLowerCase("sr"), k]));

      const postojece = await Product.find({ printerId: req.user!.id }).select("code");
      const zauzeteSifre = new Set(postojece.map((p) => p.code.toLocaleLowerCase("sr")));

      const dodati: string[] = [];
      const preskoceni: { code: string; reason: string }[] = [];
      const zaUpis: Record<string, unknown>[] = [];

      for (const red of redovi as Record<string, unknown>[]) {
        const sifra = String(red.sifra ?? "").trim();
        const naziv = String(red.naziv ?? "").trim();

        if (!sifra || !naziv) {
          preskoceni.push({ code: sifra || "(bez šifre)", reason: "Nedostaje šifra ili naziv." });
          continue;
        }

        if (zauzeteSifre.has(sifra.toLocaleLowerCase("sr"))) {
          preskoceni.push({ code: sifra, reason: "Već imate proizvod sa ovom šifrom." });
          continue;
        }

        const kategorija = poNazivu.get(String(red.kategorija ?? "").trim().toLocaleLowerCase("sr"));
        if (!kategorija) {
          preskoceni.push({
            code: sifra,
            reason: `Kategorija "${red.kategorija ?? ""}" ne postoji u bazi.`,
          });
          continue;
        }

        const cena = uBroj(red.jedinicnaCena, -1);
        const zalihe = uBroj(red.kolicinaNaLageru, -1);

        if (cena < 0 || zalihe < 0) {
          preskoceni.push({ code: sifra, reason: "Cena ili količina nije ispravan broj." });
          continue;
        }

        const boje = Array.isArray(red.dostupneBoje)
          ? (red.dostupneBoje as unknown[]).map((b) => String(b).trim()).filter(Boolean)
          : [];

        const usluge = Array.isArray(red.uslugeStampe) ? (red.uslugeStampe as unknown[]) : [];

        zaUpis.push({
          printerId: req.user!.id,
          code: sifra,
          name: naziv,
          description: String(red.opis ?? "").trim(),
          categoryId: kategorija._id,
          categoryName: kategorija.name,
          subcategoryName: String(red.potkategorija ?? "").trim(),
          unitPrice: cena,
          stock: zalihe,
          availableColors: boje.length ? boje : ["Bela"],
          mainImage: "default_product_image.svg",
          additionalImages: [],
          printServices: usluge.map((u) => napraviUslugu(u as Record<string, unknown>)),
        });

        // Sifra se zauzima odmah, da isti fajl ne bi dvaput uneo istu sifru.
        zauzeteSifre.add(sifra.toLocaleLowerCase("sr"));
        dodati.push(sifra);
      }

      if (zaUpis.length) {
        await Product.insertMany(zaUpis);
      }

      res.json({
        message:
          `Uvezeno proizvoda: ${dodati.length}.` +
          (preskoceni.length ? ` Preskočeno: ${preskoceni.length}.` : ""),
        imported: dodati.length,
        skipped: preskoceni,
        products: await Product.find({ printerId: req.user!.id, code: { $in: dodati } })
          .populate("printerId", POLJA_STAMPARA)
          .then((p) => p.map(pungProizvod)),
      });
    } catch (greska) {
      console.error("uveziIzFajla:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  // =========================================================================
  //  KLIJENT - pretraga i prosireni detalji
  // =========================================================================

  /**
   * Pretraga za prijavljenog klijenta.
   *
   * Isti uslovi kao javna pretraga - proizvodi kojih nema na stanju se ne
   * prikazuju - ali rezultat nosi i cenu, jer je klijentu ona podatak po kojem
   * bira. Prosireni podaci su na strani sa detaljima.
   */
  pretraga = async (req: Request, res: Response): Promise<void> => {
    try {
      const naziv = String(req.query.name || "").trim();
      const kategorija = String(req.query.category || "").trim();
      const smer = String(req.query.sort || "asc") === "desc" ? -1 : 1;

      const uslov: Record<string, unknown> = { stock: { $gt: 0 } };

      if (naziv) uslov.name = { $regex: zaRegex(naziv), $options: "i" };
      if (kategorija && kategorija !== "Sve kategorije") uslov.categoryName = kategorija;

      const proizvodi = await Product.find(uslov)
        .collation({ locale: "sr", strength: 1 })
        .sort({ name: smer })
        .populate("printerId", POLJA_STAMPARA);

      res.json(proizvodi.map(pungProizvod));
    } catch (greska) {
      console.error("pretraga:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Prosireni detalji jednog proizvoda.
   *
   * Ovo je ono sto javna ruta namerno ne salje: duzi opis, cena po komadu,
   * dostupne boje i vrste stampe sa maksimalnim dimenzijama. Uz to ide i
   * adresa i koordinate stamparije, za mapu na toj strani.
   */
  detalji = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      const proizvod = await Product.findById(id).populate("printerId", POLJA_STAMPARA);

      if (!proizvod) {
        res.status(404).json({ message: "Proizvod nije pronađen." });
        return;
      }

      const productId = proizvod._id as Types.ObjectId;
      const [likes, dislikes] = await Promise.all([
        Rating.countDocuments({ productId, value: 1 }),
        Rating.countDocuments({ productId, value: -1 }),
      ]);

      res.json({ ...pungProizvod(proizvod), likes, dislikes });
    } catch (greska) {
      console.error("detalji:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
