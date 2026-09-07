import fs from "fs";
import path from "path";
import { Paleta, oblikZa } from "./oblici";

/**
 * Uzorci slika za popunjenu bazu.
 *
 * Prave slike proizvoda stampari otpremaju kroz aplikaciju. Seed koristi
 * lokalne, fotorealistične JPEG katalog-fotografije, da galerija izgleda kao
 * stvaran katalog i da ne zavisi od spoljnog sajta ili URL-a.
 */

const KOREN = path.join(__dirname, "..", "..", "uploads");
const KOREN_FOTOGRAFIJA = path.join(__dirname, "assets", "product-photos");

/** Fotografije su organizovane po potkategoriji, ne po pojedinačnoj šifri. */
const FOTOGRAFIJA_ZA_POTKATEGORIJU: Record<string, string> = {
  "Štampa na majicama": "majica",
  "Štampa na duksevima": "duks",
  "Šolje": "solja",
  "Štampa na cegerima": "ceger",
  "Posteri": "poster",
  "Flajeri": "flajer",
  "Vizit karte": "vizit-karta",
  "Fascikle": "fascikla",
  "Olovke": "olovka",
  "Zahvalnice": "zahvalnica",
  "Pozivnice": "pozivnica",
  "Rollups": "rollup",
  "Fototapete": "fototapeta",
};

/**
 * Ovi proizvodi se oblikom ili materijalom razlikuju od generičke potkategorije.
 * Bez preslikavanja bi, na primer, crna magična šolja dobila belu fotografiju,
 * a duks bez kapuljače fotografiju modela sa kapuljačom.
 */
const FOTOGRAFIJA_ZA_PROIZVOD: Record<string, string> = {
  "PR-001": "polo-majica",
  "PR-011": "polo-majica",
  "PR-012": "polo-majica",
  "PR-020": "solja-obojena",
  "PR-023": "olovka-reciklirana",
  "PR-027": "duks-bez-kapuljace",
  "PR-032": "solja-latte",
  "PR-033": "majica-sportska",
  "PR-034": "ceger-juta",
  "PR-036": "fascikla-gumica",
  "PR-039": "duks-decji",
  "PR-040": "solja-kasicica",
  "PR-041": "olovka-metalna",
  "PR-042": "vizit-soft-touch",
  "PR-043": "fototapeta-beton",
  "PR-045": "polo-majica",
  "PR-049": "rollup-dvostrani",
  "PR-050": "solja-magicna-crna",
  "PR-051": "duks-oversize",
  "PR-052": "fascikla-kraft",
};

// 1x1 JPEG - podrazumevana profilna slika koju tekst zadatka imenuje
const PRAZAN_JPEG =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy" +
  "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA" +
  "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA" +
  "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3" +
  "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm" +
  "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA" +
  "AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx" +
  "BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK" +
  "U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3" +
  "uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iii" +
  "gD//2Q==";

/** Palete proizvoda. Sve slike jednog proizvoda koriste istu paletu. */
const PALETE: { podloga: string; predmet: Paleta }[] = [
  { podloga: "#EFEAE0", predmet: { telo: "#FBF9F4", ivica: "#1A1815", detalj: "#C9C0AE" } },
  { podloga: "#E4E9EC", predmet: { telo: "#2C4A54", ivica: "#12303A", detalj: "#7FA3AF" } },
  { podloga: "#EDE6EC", predmet: { telo: "#8E2A5C", ivica: "#4A1030", detalj: "#D48FB4" } },
  { podloga: "#EFEDE0", predmet: { telo: "#E8C64A", ivica: "#4A3E08", detalj: "#B99A25" } },
  { podloga: "#E6E9E2", predmet: { telo: "#37413A", ivica: "#181D19", detalj: "#8A968C" } },
];

/**
 * Jedan uzorak slike proizvoda: predmet nacrtan na obojenoj podlozi.
 *
 * Predmet se bira po POTKATEGORIJI (solja, majica, poster...), pa se na strani
 * za pripremu stampe vidi na cemu se zapravo stampa. Ranije je ovde stajala
 * tekstualna kartica sa nazivom, sto je bilo citljivo ali beskorisno cim je
 * trebalo postaviti otisak preko slike.
 */
function svgProizvod(
  potkategorija: string,
  paleta: { podloga: string; predmet: Paleta },
  transformacija = ""
): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">',
    `  <rect width="600" height="600" fill="${paleta.podloga}"/>`,
    // registarski markovi u uglovima, isti jezik kao na obrascima
    `  <g stroke="${paleta.predmet.ivica}" stroke-width="2" opacity="0.3" fill="none">`,
    '    <path d="M28 60 V28 H60"/><path d="M540 28 H572 V60"/>',
    '    <path d="M572 540 V572 H540"/><path d="M60 572 H28 V540"/>',
    "  </g>",
    `  <g transform="${transformacija}">`,
    oblikZa(potkategorija)(paleta.predmet),
    "  </g>",
    "</svg>",
  ].join("\n");
}

/**
 * Pravi uzorke slika i vraca putanje koje se upisuju u bazu.
 * Za svaki proizvod: glavna slika + tri dodatne za galeriju. Prikazi nisu
 * varijante boje: to je zaseban izbor kupca pri naručivanju. Četvrti kadar je
 * kontekstualni (proizvod u upotrebi ili na neutralnoj lutki).
 */
export function napraviUzorkeSlika(
  proizvodi: { code: string; name: string; potkategorija: string }[]
): Record<string, { glavna: string; dodatne: string[] }> {
  for (const folder of [KOREN, path.join(KOREN, "profile"), path.join(KOREN, "product")]) {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  }

  fs.writeFileSync(
    path.join(KOREN, "default_profile_image.jpg"),
    Buffer.from(PRAZAN_JPEG, "base64")
  );

  const rezultat: Record<string, { glavna: string; dodatne: string[] }> = {};

  proizvodi.forEach((proizvod) => {
    const putanje: string[] = [];

    const kljuc =
      FOTOGRAFIJA_ZA_PROIZVOD[proizvod.code] ??
      FOTOGRAFIJA_ZA_POTKATEGORIJU[proizvod.potkategorija];
    if (!kljuc) throw new Error(`Nedostaje fotografija za potkategoriju: ${proizvod.potkategorija}`);

    for (let varijanta = 1; varijanta <= 4; varijanta++) {
      const izvor = path.join(KOREN_FOTOGRAFIJA, `${kljuc}-${varijanta}.jpg`);
      const ime = `${proizvod.code.toLowerCase()}-${varijanta}.jpg`;
      if (!fs.existsSync(izvor)) throw new Error(`Nedostaje seed fotografija: ${izvor}`);

      fs.copyFileSync(izvor, path.join(KOREN, "product", ime));

      putanje.push(`product/${ime}`);
    }

    rezultat[proizvod.code] = { glavna: putanje[0], dodatne: putanje.slice(1) };
  });

  // Podrazumevana slika proizvoda - dobijaju je proizvodi uneti bez slike,
  // ukljucujuci i one uvezene iz JSON fajla.
  fs.writeFileSync(
    path.join(KOREN, "default_product_image.svg"),
    svgProizvod("", PALETE[0]),
    "utf8"
  );

  return rezultat;
}

/* ==========================================================================
   Profilne slike
   ========================================================================== */

/**
 * Podloge za avatare - tamnije od podloga proizvoda, da inicijali budu citljivi
 * u belom.
 */
const PODLOGE_AVATARA = ["#1F3B45", "#4A1030", "#3D3405", "#24211D", "#123A45", "#3A2416"];

/**
 * Jedan avatar: inicijali na obojenoj podlozi, sa registarskim markovima u
 * uglovima - isti jezik kao na obrascima i slikama proizvoda.
 *
 * 200x200 px, dakle unutar granica koje tekst zadatka trazi za profilnu sliku
 * (najmanje 100x100, najvise 250x250).
 */
function svgAvatar(inicijali: string, podloga: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">',
    `  <rect width="200" height="200" fill="${podloga}"/>`,
    '  <g stroke="#FBF9F4" stroke-width="1.5" opacity="0.3" fill="none">',
    '    <path d="M14 30 V14 H30"/><path d="M170 14 H186 V30"/>',
    '    <path d="M186 170 V186 H170"/><path d="M30 186 H14 V170"/>',
    "  </g>",
    '  <text x="100" y="100" text-anchor="middle" dominant-baseline="central"',
    '        fill="#FBF9F4" font-family="Georgia, serif" font-size="72"',
    '        letter-spacing="2">' + inicijali + "</text>",
    "</svg>",
  ].join("\n");
}

/**
 * Pravi profilne slike za naloge iz seed skripta i vraca putanje.
 *
 * Prave slike korisnici otpremaju kroz aplikaciju, kroz FileUpload. Ovi uzorci
 * postoje samo da bi popunjena baza izgledala kao popunjena - bez njih bi svaki
 * nalog imao istu podrazumevanu sliku, pa se na spiskovima ne bi razlikovali.
 *
 * Nalozi koji CEKAJU odobrenje namerno NE dobijaju avatar: oni ostaju na
 * default_profile_image.jpg, da se na odbrani vidi i taj slucaj.
 */
export function napraviAvatare(
  korisnici: { username: string; firstName: string; lastName: string }[]
): Record<string, string> {
  const folder = path.join(KOREN, "profile");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const rezultat: Record<string, string> = {};

  korisnici.forEach((korisnik, redni) => {
    const inicijali =
      (korisnik.firstName.charAt(0) + korisnik.lastName.charAt(0)).toLocaleUpperCase("sr");

    const ime = `${korisnik.username.toLowerCase()}.svg`;
    const podloga = PODLOGE_AVATARA[redni % PODLOGE_AVATARA.length];

    fs.writeFileSync(path.join(folder, ime), svgAvatar(inicijali, podloga), "utf8");

    rezultat[korisnik.username] = `profile/${ime}`;
  });

  return rezultat;
}
