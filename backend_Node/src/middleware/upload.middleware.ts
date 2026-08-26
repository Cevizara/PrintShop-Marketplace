import fs from "fs";
import multer from "multer";
import path from "path";
import { imageSize } from "image-size";

/**
 * Otpremanje slika.
 *
 * Tekst zadatka: "Slike u aplikaciji moraju da budu unete preko FileUpload
 * prozora, i nije prihvatljivo resenje da budu vec rucno unete, ili da se
 * unose putem eksternog linka do slike na drugoj lokaciji."
 *
 * Zato se sve slike primaju kao multipart/form-data i snimaju u uploads/.
 */
export const KOREN_OTPREME = path.join(__dirname, "..", "..", "uploads");

const FOLDERI = {
  profil: path.join(KOREN_OTPREME, "profile"),
  proizvod: path.join(KOREN_OTPREME, "product"),
  stampa: path.join(KOREN_OTPREME, "print"),
};

export function pripremiFoldere(): void {
  for (const folder of [KOREN_OTPREME, ...Object.values(FOLDERI)]) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
}

const DOZVOLJENI_TIPOVI = ["image/jpeg", "image/png", "image/gif"];

function napraviPrijemnik(folder: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_zahtev, _fajl, dalje) => dalje(null, folder),
      filename: (_zahtev, fajl, dalje) => {
        // Ime fajla se ne preuzima od korisnika - inace bi dva korisnika sa
        // istom slikom prepisala jedan drugom fajl, a i ime moze da sadrzi
        // putanju ("../../nesto") i izadje iz foldera.
        const jedinstveno = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        dalje(null, jedinstveno + path.extname(fajl.originalname).toLowerCase());
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_zahtev, fajl, dalje) => {
      if (!DOZVOLJENI_TIPOVI.includes(fajl.mimetype)) {
        dalje(new Error("Dozvoljeni su samo JPG, PNG i GIF formati."));
        return;
      }
      dalje(null, true);
    },
  });
}

export const otpremiProfilnuSliku = napraviPrijemnik(FOLDERI.profil);
export const otpremiSlikuProizvoda = napraviPrijemnik(FOLDERI.proizvod);
export const otpremiSlikuZaStampu = napraviPrijemnik(FOLDERI.stampa);

/**
 * Prijemnik za JSON fajl sa lager listom (Prilog 1 teksta zadatka).
 *
 * Ovaj fajl se, za razliku od slika, NE cuva na disku: procita se, iz njega se
 * naprave proizvodi, i vise nikom ne treba. Zato ide u memoriju - inace bi se
 * u uploads/ gomilali fajlovi koje niko nikada ne otvara.
 */
export const otpremiJsonFajl = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_zahtev, fajl, dalje) => {
    // Neki pregledaci salju "application/json", neki "text/plain", a neki
    // prazan tip - zato se gleda i nastavak imena fajla.
    const jeJson =
      fajl.mimetype === "application/json" ||
      path.extname(fajl.originalname).toLowerCase() === ".json";

    if (!jeJson) {
      dalje(new Error("Očekuje se JSON fajl sa lager listom."));
      return;
    }
    dalje(null, true);
  },
});

export interface ProveraDimenzija {
  ispravno: boolean;
  poruka?: string;
  sirina?: number;
  visina?: number;
}

/**
 * Provera dimenzija slike NA SERVERU.
 *
 * Tekst zadatka trazi profilnu sliku najmanje 100x100 i najvise 250x250 px.
 * Ista provera postoji i u pregledacu, ali samo da bi korisnik odmah dobio
 * poruku - zaobilazi se slanjem zahteva mimo aplikacije.
 *
 * Vazno: proverava se broj piksela, a ne velicina fajla.
 */
export function proveriDimenzije(
  putanja: string,
  najmanje: number,
  najvise: number
): ProveraDimenzija {
  try {
    const dimenzije = imageSize(fs.readFileSync(putanja));

    if (!dimenzije.width || !dimenzije.height) {
      return { ispravno: false, poruka: "Nije moguće pročitati dimenzije slike." };
    }

    const { width, height } = dimenzije;

    if (width < najmanje || height < najmanje || width > najvise || height > najvise) {
      return {
        ispravno: false,
        sirina: width,
        visina: height,
        poruka:
          `Slika mora biti između ${najmanje}x${najmanje} i ${najvise}x${najvise} piksela. ` +
          `Poslata slika je ${width}x${height}.`,
      };
    }

    return { ispravno: true, sirina: width, visina: height };
  } catch {
    return { ispravno: false, poruka: "Izabrani fajl nije ispravna slika." };
  }
}

/**
 * Brise fajl koji je vec primljen, ali je zahtev posle toga pao na nekoj
 * proveri. Bez ovoga bi se u uploads/ gomilale slike neuspelih registracija.
 */
export function obrisiFajl(putanja?: string): void {
  if (!putanja) return;
  try {
    if (fs.existsSync(putanja)) fs.unlinkSync(putanja);
  } catch {
    // Namerno cutimo: neuspelo brisanje privremenog fajla nije razlog da
    // ceo zahtev propadne.
  }
}
