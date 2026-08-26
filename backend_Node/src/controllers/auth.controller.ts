import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../config/env";
import { napraviToken } from "../middleware/auth.middleware";
import { obrisiFajl, proveriDimenzije } from "../middleware/upload.middleware";
import PasswordReset from "../models/PasswordReset";
import User, { UserType } from "../models/User";
import { javniKorisnik } from "../utils/mappers";
import {
  EMAIL,
  KORISNICKO_IME,
  LOZINKA,
  MATICNI_BROJ,
  PIB,
  Provera,
  TELEFON,
} from "../utils/validation";

/** Tipovi koji uz osnovne podatke unose i podatke o instituciji. */
const SA_INSTITUCIJOM: UserType[] = ["CLIENT_COMPANY", "PRINTER"];

/** Tipovi koje je dozvoljeno registrovati. Administrator se ne registruje. */
const ZA_REGISTRACIJU: UserType[] = ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY", "PRINTER"];

export class AuthController {
  /**
   * Registracija svih tipova korisnika.
   *
   * Nalog se NE pravi kao aktivan nego u statusu PENDING - tekst zadatka trazi
   * da zahtev ceka odobrenje administratora.
   *
   * Zahtev stize kao multipart/form-data jer nosi i profilnu sliku.
   */
  registracija = async (req: Request, res: Response): Promise<void> => {
    const putanjaSlike = req.file?.path;

    try {
      const {
        username,
        password,
        firstName,
        lastName,
        phone,
        email,
        type,
        institutionName,
        institutionAddress,
        institutionCity,
        registrationNumber,
        taxId,
      } = req.body;

      const jeInstitucija = SA_INSTITUCIJOM.includes(type);

      // --- 1. oblik podataka ---------------------------------------------
      const provera = new Provera()
        .obavezno("username", username, "Korisničko ime")
        .oblik(
          "username",
          username,
          KORISNICKO_IME,
          "Korisničko ime sme imati 3-30 karaktera: slova, brojevi, tačka, donja crta i crta."
        )
        .obavezno("password", password, "Lozinka")
        .oblik(
          "password",
          password,
          LOZINKA,
          "Lozinka mora imati 8-12 karaktera, počinjati slovom i sadržati bar jedno " +
            "veliko slovo, jedan broj i jedan specijalni karakter."
        )
        .obavezno("firstName", firstName, "Ime")
        .obavezno("lastName", lastName, "Prezime")
        .obavezno("phone", phone, "Kontakt telefon")
        .oblik("phone", phone, TELEFON, "Kontakt telefon nije u ispravnom formatu.")
        .obavezno("email", email, "I-mejl adresa")
        .oblik("email", email, EMAIL, "I-mejl adresa nije u ispravnom formatu.")
        .uslov("type", ZA_REGISTRACIJU.includes(type), "Nepoznat tip korisnika.");

      if (jeInstitucija) {
        provera
          .obavezno("institutionName", institutionName, "Naziv institucije")
          .obavezno("institutionAddress", institutionAddress, "Adresa sedišta")
          .obavezno("institutionCity", institutionCity, "Grad")
          .obavezno("registrationNumber", registrationNumber, "Matični broj")
          .oblik(
            "registrationNumber",
            registrationNumber,
            MATICNI_BROJ,
            "Matični broj mora imati tačno 8 cifara."
          )
          .obavezno("taxId", taxId, "PIB")
          .oblik("taxId", taxId, PIB, "PIB mora imati 9 cifara i ne sme početi nulom.");
      }

      if (!provera.ispravno) {
        obrisiFajl(putanjaSlike);
        res.status(400).json({ message: "Podaci nisu ispravni.", errors: provera.greske });
        return;
      }

      // --- 2. jedinstvenost ------------------------------------------------
      // Proveravamo unapred da bismo vratili lepu poruku vezanu za polje.
      // Konacnu garanciju daju jedinstveni indeksi u bazi (vidi seed skript) -
      // oni hvataju i slucaj kada se dve registracije dese u istom trenutku.
      const zauzeto: { field: string; message: string }[] = [];

      if (await User.exists({ username })) {
        zauzeto.push({ field: "username", message: "Korisničko ime je već zauzeto." });
      }
      if (await User.exists({ email: String(email).toLowerCase() })) {
        zauzeto.push({ field: "email", message: "Nalog sa ovom i-mejl adresom već postoji." });
      }
      if (jeInstitucija) {
        if (await User.exists({ "institution.registrationNumber": registrationNumber })) {
          zauzeto.push({
            field: "registrationNumber",
            message: "Institucija sa ovim matičnim brojem već postoji.",
          });
        }
        if (await User.exists({ "institution.taxId": taxId })) {
          zauzeto.push({ field: "taxId", message: "Institucija sa ovim PIB-om već postoji." });
        }
      }

      if (zauzeto.length) {
        obrisiFajl(putanjaSlike);
        res.status(409).json({ message: "Podaci su već u upotrebi.", errors: zauzeto });
        return;
      }

      // --- 3. profilna slika -----------------------------------------------
      // Slika je opciona; ako je poslata, mora biti izmedju 100x100 i 250x250.
      let profilnaSlika = "default_profile_image.jpg";

      if (putanjaSlike) {
        const dimenzije = proveriDimenzije(putanjaSlike, 100, 250);

        if (!dimenzije.ispravno) {
          obrisiFajl(putanjaSlike);
          res.status(400).json({
            message: dimenzije.poruka,
            errors: [{ field: "profileImage", message: dimenzije.poruka ?? "Neispravna slika." }],
          });
          return;
        }

        profilnaSlika = `profile/${req.file!.filename}`;
      }

      // --- 4. upis ---------------------------------------------------------
      const korisnik = await User.create({
        username,
        password: await bcrypt.hash(password, 10),
        firstName,
        lastName,
        phone,
        email: String(email).toLowerCase(),
        profileImage: profilnaSlika,
        type,
        status: "PENDING",
        institution: jeInstitucija
          ? {
              name: institutionName,
              address: institutionAddress,
              city: institutionCity,
              registrationNumber,
              taxId,
            }
          : undefined,
      });

      res.status(201).json({
        message:
          "Zahtev za registraciju je poslat. Nalog postaje aktivan nakon odobrenja administratora.",
        userId: korisnik._id,
      });
    } catch (greska) {
      obrisiFajl(putanjaSlike);
      console.error("registracija:", greska);
      res.status(500).json({ message: "Greška na serveru prilikom registracije." });
    }
  };

  /** Prijava klijenata i štampara, preko javno vidljive forme. */
  prijava = async (req: Request, res: Response): Promise<void> => {
    await this.obaviPrijavu(req, res, ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY", "PRINTER"]);
  };

  /**
   * Prijava administratora.
   *
   * Tekst zadatka trazi drugu formu, sa istim poljima, koja nije javno vidljiva
   * i stoji na posebnoj ruti. Ovo je serverska strana te podele: ovaj endpoint
   * prihvata iskljucivo naloge tipa ADMIN, a javni endpoint ih odbija.
   * Da su oba isti endpoint, "posebna ruta" bi bila samo kozmetika.
   */
  prijavaAdministratora = async (req: Request, res: Response): Promise<void> => {
    await this.obaviPrijavu(req, res, ["ADMIN"]);
  };

  private obaviPrijavu = async (
    req: Request,
    res: Response,
    dozvoljeniTipovi: UserType[]
  ): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ message: "Unesite korisničko ime i lozinku." });
        return;
      }

      const korisnik = await User.findOne({ username });

      // Ista poruka za nepostojeceg korisnika, za pogresnu lozinku i za nalog
      // pogresnog tipa. Da su poruke razlicite, moglo bi se redom isprobavati
      // koja korisnicka imena postoje u sistemu.
      const neuspelo = () =>
        res.status(401).json({ message: "Pogrešno korisničko ime ili lozinka." });

      if (!korisnik || !dozvoljeniTipovi.includes(korisnik.type)) {
        neuspelo();
        return;
      }

      if (!(await bcrypt.compare(password, korisnik.password))) {
        neuspelo();
        return;
      }

      // Status se proverava TEK POSLE lozinke. Obrnutim redosledom bi neko bez
      // lozinke mogao da sazna da li nalog postoji i u kom je stanju.
      if (korisnik.status === "PENDING") {
        res.status(403).json({
          message: "Vaš zahtev za registraciju još uvek čeka odobrenje administratora.",
        });
        return;
      }

      if (korisnik.status === "REJECTED") {
        res.status(403).json({ message: "Vaš zahtev za registraciju je odbijen." });
        return;
      }

      res.json({
        token: napraviToken({
          id: String(korisnik._id),
          username: korisnik.username,
          type: korisnik.type,
        }),
        user: javniKorisnik(korisnik),
      });
    } catch (greska) {
      console.error("prijava:", greska);
      res.status(500).json({ message: "Greška na serveru prilikom prijave." });
    }
  };

  // ---------------------------------------------------------------------
  // Zaboravljena lozinka
  // ---------------------------------------------------------------------

  /**
   * Korak 1: korisnik unosi korisnicko ime ILI i-mejl adresu, i odmah dobija
   * privremeni veb link za postavljanje nove lozinke.
   *
   * Tekst zadatka: "korisnik moze uneti svoje korisnicko ime ili i-mejl
   * adresu, cime dobija veb link za ponistavanje lozinke i postavljanje nove,
   * putem veb linka". Link se, dakle, prikazuje korisniku - ne salje se mejlom.
   *
   * Token je 32 nasumicna bajta iz crypto.randomBytes, a ne Math.random() -
   * Math.random() je predvidiv i ne sme se koristiti za nesto sto stiti nalog.
   *
   * NAPOMENA O BEZBEDNOSTI: posto se link prikazuje odmah, dovoljno je znati
   * tudje korisnicko ime da bi se promenila tudja lozinka. Tako trazi tekst
   * zadatka; u pravoj aplikaciji link bi isao na i-mejl vlasnika naloga.
   */
  zaboravljenaLozinka = async (req: Request, res: Response): Promise<void> => {
    try {
      const podatak = String(req.body.identifier || "").trim();

      if (!podatak) {
        res.status(400).json({ message: "Unesite korisničko ime ili i-mejl adresu." });
        return;
      }

      const korisnik = await User.findOne({
        $or: [{ username: podatak }, { email: podatak.toLowerCase() }],
      });

      if (!korisnik) {
        res.status(404).json({
          message: "Ne postoji nalog sa tim korisničkim imenom ili i-mejl adresom.",
        });
        return;
      }

      // Raniji nezavrseni zahtevi se ponistavaju: ako korisnik zatrazi novi
      // link, stari prestaje da vazi. Inace bi vise linkova bilo aktivno
      // istovremeno, svaki sa svojim rokom.
      await PasswordReset.updateMany(
        { userId: korisnik._id, used: false },
        { $set: { used: true } }
      );

      const token = crypto.randomBytes(32).toString("hex");
      const istice = new Date(Date.now() + env.passwordResetMinutes * 60 * 1000);

      await PasswordReset.create({ userId: korisnik._id, token, expiresAt: istice, used: false });

      res.json({
        message:
          `Link za postavljanje nove lozinke je spreman. ` +
          `Važi ${env.passwordResetMinutes} minuta i može se iskoristiti samo jednom.`,
        link: `${env.clientUrl}/reset-lozinke/${token}`,
        expiresAt: istice,
        username: korisnik.username,
      });
    } catch (greska) {
      console.error("zaboravljenaLozinka:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Provera da li je link jos uvek upotrebljiv.
   * Strana za unos nove lozinke ovo zove pri otvaranju, da bi odmah rekla da
   * je link istekao, umesto da korisnik popuni formu pa tek onda sazna.
   */
  proveriToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const zahtev = await PasswordReset.findOne({ token: String(req.params.token) });

      if (!zahtev || zahtev.used || zahtev.expiresAt.getTime() < Date.now()) {
        res.status(400).json({
          valid: false,
          message: "Link je istekao ili je već iskorišćen.",
        });
        return;
      }

      res.json({ valid: true });
    } catch (greska) {
      console.error("proveriToken:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Korak 2: postavljanje nove lozinke preko tokena iz linka. */
  postaviNovuLozinku = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;

      // Nova lozinka mora zadovoljiti isti izraz kao i pri registraciji -
      // inace bi se preko ove rute zaobisla sva pravila o lozinkama.
      if (!LOZINKA.test(String(password || ""))) {
        res.status(400).json({
          message:
            "Lozinka mora imati 8-12 karaktera, počinjati slovom i sadržati bar jedno " +
            "veliko slovo, jedan broj i jedan specijalni karakter.",
          errors: [{ field: "password", message: "Lozinka nije u traženom obliku." }],
        });
        return;
      }

      const zahtev = await PasswordReset.findOne({ token });

      // Rok se proverava OVDE, na serveru. Da se oslanjamo na tajmer u
      // pregledacu, dovoljno bi bilo osveziti stranu.
      if (!zahtev || zahtev.used || zahtev.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ message: "Link je istekao ili je već iskorišćen." });
        return;
      }

      await User.updateOne(
        { _id: zahtev.userId },
        { $set: { password: await bcrypt.hash(password, 10) } }
      );

      // Token je jednokratan - odmah prestaje da vazi.
      zahtev.used = true;
      await zahtev.save();

      res.json({ message: "Lozinka je promenjena. Sada se možete prijaviti." });
    } catch (greska) {
      console.error("postaviNovuLozinku:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
