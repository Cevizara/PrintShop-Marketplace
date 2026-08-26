import { Request, Response } from "express";
import { Types } from "mongoose";
import path from "path";
import { obrisiFajl, proveriDimenzije } from "../middleware/upload.middleware";
import Product from "../models/Product";
import User, { IUser, UserType } from "../models/User";
import { javniKorisnik } from "../utils/mappers";
import { EMAIL, MATICNI_BROJ, PIB, Provera, TELEFON, zaRegex } from "../utils/validation";

/** Tipovi koji uz osnovne podatke imaju i podatke o instituciji. */
const SA_INSTITUCIJOM: UserType[] = ["CLIENT_COMPANY", "PRINTER"];

/**
 * Zajednicka provera podataka profila. Koristi je i korisnik kada menja svoj
 * profil, i administrator kada menja tudji - pravila su ista, menja se samo ko
 * sme da pozove rutu.
 */
function proveriPodatke(telo: Record<string, unknown>, jeInstitucija: boolean) {
  const provera = new Provera()
    .obavezno("firstName", telo.firstName, "Ime")
    .obavezno("lastName", telo.lastName, "Prezime")
    .obavezno("phone", telo.phone, "Kontakt telefon")
    .oblik("phone", telo.phone, TELEFON, "Kontakt telefon nije u ispravnom formatu.")
    .obavezno("email", telo.email, "I-mejl adresa")
    .oblik("email", telo.email, EMAIL, "I-mejl adresa nije u ispravnom formatu.");

  if (jeInstitucija) {
    provera
      .obavezno("institutionName", telo.institutionName, "Naziv institucije")
      .obavezno("institutionAddress", telo.institutionAddress, "Adresa sedišta")
      .obavezno("institutionCity", telo.institutionCity, "Grad")
      .obavezno("registrationNumber", telo.registrationNumber, "Matični broj")
      .oblik(
        "registrationNumber",
        telo.registrationNumber,
        MATICNI_BROJ,
        "Matični broj mora imati tačno 8 cifara."
      )
      .obavezno("taxId", telo.taxId, "PIB")
      .oblik("taxId", telo.taxId, PIB, "PIB mora imati 9 cifara i ne sme početi nulom.");
  }

  return provera;
}

/**
 * Upisuje primljene podatke u korisnika.
 *
 * Namerno prepisuje SAMO polja koja se smeju menjati. Da se ovde radilo
 * Object.assign(korisnik, req.body), klijent bi mogao da posalje
 * { type: "ADMIN" } ili { status: "APPROVED" } i sam sebi da da prava.
 */
function upisiPodatke(
  korisnik: IUser,
  telo: Record<string, unknown>,
  jeInstitucija: boolean
): void {
  korisnik.set("firstName", String(telo.firstName).trim());
  korisnik.set("lastName", String(telo.lastName).trim());
  korisnik.set("phone", String(telo.phone).trim());
  korisnik.set("email", String(telo.email).trim().toLowerCase());

  if (jeInstitucija) {
    korisnik.set("institution.name", String(telo.institutionName).trim());
    korisnik.set("institution.address", String(telo.institutionAddress).trim());
    korisnik.set("institution.city", String(telo.institutionCity).trim());
    korisnik.set("institution.registrationNumber", String(telo.registrationNumber).trim());
    korisnik.set("institution.taxId", String(telo.taxId).trim());

    // Koordinate su opcione - unosi ih stampar da bi se na strani sa detaljima
    // proizvoda videla mapa. Prazno polje znaci "ne diraj".
    if (telo.lat !== undefined && String(telo.lat).trim() !== "") {
      korisnik.set("institution.lat", Number(telo.lat));
    }
    if (telo.lng !== undefined && String(telo.lng).trim() !== "") {
      korisnik.set("institution.lng", Number(telo.lng));
    }
  }
}

/**
 * Provera da mejl, maticni broj i PIB nisu vec zauzeti kod NEKOG DRUGOG.
 * $ne po _id je ono sto razlikuje izmenu od registracije: korisnik sme da
 * sacuva profil bez menjanja mejla, a da mu sopstveni mejl ne bude prepreka.
 */
async function proveriZauzetost(
  id: Types.ObjectId | string,
  telo: Record<string, unknown>,
  jeInstitucija: boolean
) {
  const zauzeto: { field: string; message: string }[] = [];

  if (await User.exists({ _id: { $ne: id }, email: String(telo.email).trim().toLowerCase() })) {
    zauzeto.push({ field: "email", message: "Nalog sa ovom i-mejl adresom već postoji." });
  }

  if (jeInstitucija) {
    if (
      await User.exists({
        _id: { $ne: id },
        "institution.registrationNumber": String(telo.registrationNumber).trim(),
      })
    ) {
      zauzeto.push({
        field: "registrationNumber",
        message: "Institucija sa ovim matičnim brojem već postoji.",
      });
    }
    if (
      await User.exists({ _id: { $ne: id }, "institution.taxId": String(telo.taxId).trim() })
    ) {
      zauzeto.push({ field: "taxId", message: "Institucija sa ovim PIB-om već postoji." });
    }
  }

  return zauzeto;
}

export class UserController {
  // =========================================================================
  //  PROFIL - svaki prijavljen korisnik nad svojim nalogom
  // =========================================================================

  /**
   * Podaci prijavljenog korisnika.
   *
   * Cita se iz BAZE po identifikatoru iz tokena, a ne iz samog tokena: token je
   * napravljen pri prijavi i ne zna za izmene koje su se desile posle toga.
   */
  mojProfil = async (req: Request, res: Response): Promise<void> => {
    try {
      const korisnik = await User.findById(req.user!.id);

      if (!korisnik) {
        res.status(404).json({ message: "Nalog nije pronađen." });
        return;
      }

      res.json(javniKorisnik(korisnik));
    } catch (greska) {
      console.error("mojProfil:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Azuriranje sopstvenog profila.
   *
   * Tekst zadatka: "pregled i azuriranje licnih podataka (osim zabrane promene
   * korisnickog imena)". Korisnicko ime se zato ni ne cita iz zahteva - ne
   * postoji putanja kojom bi se promenilo, umesto da se oslanjamo na to da ga
   * forma ne salje.
   */
  azurirajProfil = async (req: Request, res: Response): Promise<void> => {
    try {
      const korisnik = await User.findById(req.user!.id);

      if (!korisnik) {
        res.status(404).json({ message: "Nalog nije pronađen." });
        return;
      }

      const jeInstitucija = SA_INSTITUCIJOM.includes(korisnik.type);
      const provera = proveriPodatke(req.body, jeInstitucija);

      if (!provera.ispravno) {
        res.status(400).json({ message: "Podaci nisu ispravni.", errors: provera.greske });
        return;
      }

      const zauzeto = await proveriZauzetost(korisnik._id as Types.ObjectId, req.body, jeInstitucija);
      if (zauzeto.length) {
        res.status(409).json({ message: "Podaci su već u upotrebi.", errors: zauzeto });
        return;
      }

      upisiPodatke(korisnik, req.body, jeInstitucija);
      await korisnik.save();

      res.json({ message: "Podaci su sačuvani.", user: javniKorisnik(korisnik) });
    } catch (greska) {
      console.error("azurirajProfil:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Promena profilne slike.
   *
   * Ista pravila kao pri registraciji: FileUpload, 100x100 do 250x250, provera
   * na serveru. Stara slika se brise - bez toga bi se u uploads/ gomilale sve
   * slike koje je korisnik ikada postavio.
   */
  promeniProfilnuSliku = async (req: Request, res: Response): Promise<void> => {
    const putanja = req.file?.path;

    try {
      if (!putanja) {
        res.status(400).json({ message: "Niste izabrali sliku." });
        return;
      }

      const dimenzije = proveriDimenzije(putanja, 100, 250);
      if (!dimenzije.ispravno) {
        obrisiFajl(putanja);
        res.status(400).json({
          message: "Slika nije ispravna.",
          errors: [{ field: "profileImage", message: dimenzije.poruka }],
        });
        return;
      }

      const korisnik = await User.findById(req.user!.id);
      if (!korisnik) {
        obrisiFajl(putanja);
        res.status(404).json({ message: "Nalog nije pronađen." });
        return;
      }

      const stara = korisnik.profileImage;
      korisnik.profileImage = "profile/" + req.file!.filename;
      await korisnik.save();

      // Podrazumevana slika je zajednicka svima i nikada se ne brise.
      if (stara && stara !== "default_profile_image.jpg") {
        obrisiFajl(path.join(__dirname, "..", "..", "uploads", stara));
      }

      res.json({ message: "Profilna slika je promenjena.", user: javniKorisnik(korisnik) });
    } catch (greska) {
      obrisiFajl(putanja);
      console.error("promeniProfilnuSliku:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  // =========================================================================
  //  ZAHTEVI ZA REGISTRACIJU - administrator
  // =========================================================================

  /**
   * Zahtevi za registraciju - poseban tabelarni pregled svih neodobrenih
   * korisnika, kako trazi tekst zadatka.
   *
   * Upit filtrira po statusu PENDING i koristi indeks idx_status. To je retka
   * vrednost u polju sa svega tri moguce vrednosti - slucaj u kojem indeks
   * najvise dobija.
   */
  zahteviZaRegistraciju = async (_req: Request, res: Response): Promise<void> => {
    try {
      const zahtevi = await User.find({ status: "PENDING" }).sort({ createdAt: 1 });
      res.json(zahtevi.map(javniKorisnik));
    } catch (greska) {
      console.error("zahteviZaRegistraciju:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Prihvatanje ili odbacivanje jednog zahteva. */
  obradiZahtev = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, approve } = req.body;

      const korisnik = await User.findById(userId);

      if (!korisnik) {
        res.status(404).json({ message: "Korisnik nije pronađen." });
        return;
      }

      // Sprecava da dva administratora obrade isti zahtev, i da se vec odobren
      // nalog "odobri" jos jednom.
      if (korisnik.status !== "PENDING") {
        res.status(400).json({ message: "Ovaj zahtev je već obrađen." });
        return;
      }

      korisnik.status = approve ? "APPROVED" : "REJECTED";
      await korisnik.save();

      res.json({
        message: approve
          ? `Nalog "${korisnik.username}" je odobren.`
          : `Zahtev korisnika "${korisnik.username}" je odbijen.`,
        user: javniKorisnik(korisnik),
      });
    } catch (greska) {
      console.error("obradiZahtev:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  // =========================================================================
  //  UPRAVLJANJE NALOZIMA - administrator
  // =========================================================================

  /**
   * Svi korisnicki nalozi, uz pretragu po imenu i filtriranje po tipu i statusu.
   *
   * Administrator je jedini kome ova ruta treba, pa nema stranicenja: broj
   * naloga u ovakvom sistemu je reda stotina, a ne miliona.
   */
  sviKorisnici = async (req: Request, res: Response): Promise<void> => {
    try {
      const pojam = String(req.query.search || "").trim();
      const tip = String(req.query.type || "").trim();
      const status = String(req.query.status || "").trim();

      const uslov: Record<string, unknown> = {};

      if (tip) uslov.type = tip;
      if (status) uslov.status = status;

      if (pojam) {
        // Unos se cisti pre nego sto udje u regularni izraz - inace bi znakovi
        // poput "(" ili "*" promenili znacenje upita ili ga srusili.
        const izraz = { $regex: zaRegex(pojam), $options: "i" };
        uslov.$or = [
          { username: izraz },
          { firstName: izraz },
          { lastName: izraz },
          { email: izraz },
          { "institution.name": izraz },
        ];
      }

      const korisnici = await User.find(uslov)
        .collation({ locale: "sr", strength: 1 })
        .sort({ type: 1, username: 1 });

      res.json(korisnici.map(javniKorisnik));
    } catch (greska) {
      console.error("sviKorisnici:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Administrator menja podatke bilo kog naloga. Korisnicko ime ni ovde ne. */
  azurirajKorisnika = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator korisnika." });
        return;
      }

      const korisnik = await User.findById(id);
      if (!korisnik) {
        res.status(404).json({ message: "Korisnik nije pronađen." });
        return;
      }

      const jeInstitucija = SA_INSTITUCIJOM.includes(korisnik.type);
      const provera = proveriPodatke(req.body, jeInstitucija);

      if (!provera.ispravno) {
        res.status(400).json({ message: "Podaci nisu ispravni.", errors: provera.greske });
        return;
      }

      const zauzeto = await proveriZauzetost(id, req.body, jeInstitucija);
      if (zauzeto.length) {
        res.status(409).json({ message: "Podaci su već u upotrebi.", errors: zauzeto });
        return;
      }

      upisiPodatke(korisnik, req.body, jeInstitucija);

      // Administrator sme i da promeni status naloga - time se nalog moze
      // naknadno onemoguciti bez brisanja.
      const status = String(req.body.status || "");
      if (["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        korisnik.status = status as typeof korisnik.status;
      }

      await korisnik.save();

      res.json({ message: "Nalog je izmenjen.", user: javniKorisnik(korisnik) });
    } catch (greska) {
      console.error("azurirajKorisnika:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Brisanje naloga.
   *
   * Dve zastite koje nisu ocigledne:
   *
   * 1) Administrator ne moze da obrise SAM SEBE. Bez toga bi jedan pogresan
   *    klik ostavio sistem bez ijednog administratorskog naloga, a novi se po
   *    tekstu zadatka ne registruje kroz aplikaciju.
   *
   * 2) Kada se brise stamparija, brisu se i njeni proizvodi. Proizvod bez
   *    stampara nema smisla: pretraga bi ga i dalje nalazila, a strana sa
   *    detaljima bi prikazivala prazno ime stamparije i grad.
   */
  obrisiKorisnika = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator korisnika." });
        return;
      }

      if (id === req.user!.id) {
        res.status(400).json({ message: "Ne možete obrisati nalog kojim ste prijavljeni." });
        return;
      }

      const korisnik = await User.findById(id);
      if (!korisnik) {
        res.status(404).json({ message: "Korisnik nije pronađen." });
        return;
      }

      let obrisanoProizvoda = 0;
      if (korisnik.type === "PRINTER") {
        const ishod = await Product.deleteMany({ printerId: korisnik._id });
        obrisanoProizvoda = ishod.deletedCount ?? 0;
      }

      await korisnik.deleteOne();

      res.json({
        message:
          `Nalog "${korisnik.username}" je obrisan.` +
          (obrisanoProizvoda ? ` Uz njega je obrisano i proizvoda: ${obrisanoProizvoda}.` : ""),
        deletedProducts: obrisanoProizvoda,
      });
    } catch (greska) {
      console.error("obrisiKorisnika:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
