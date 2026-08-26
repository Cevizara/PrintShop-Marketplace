/**
 * Sadrzaj kojim se puni baza. Odvojen od samog skripta da bi se lako menjao.
 * Tekst zadatka trazi da se na odbranu donese baza popunjena dovoljnom
 * kolicinom podataka da se vide sve funkcionalnosti.
 */

export const KATEGORIJE = [
  {
    name: "Štampa malih formata",
    subcategories: ["Olovke", "Vizit karte", "Flajeri", "Zahvalnice", "Pozivnice", "Fascikle"],
  },
  {
    name: "Štampa velikih formata",
    subcategories: ["Posteri", "Rollups", "Fototapete"],
  },
  {
    name: "Kreativne štampe",
    subcategories: ["Šolje", "Štampa na majicama", "Štampa na duksevima", "Štampa na cegerima"],
  },
];

export const STAMPARIJE = [
  {
    username: "copystudio",
    password: "Stampar1!",
    firstName: "Jovana",
    lastName: "Ilić",
    phone: "063 111 2222",
    email: "info@copystudio.rs",
    institution: {
      name: "Copy Studio Kumanovska",
      address: "Kumanovska 14",
      city: "Beograd",
      lat: 44.8045,
      lng: 20.4682,
      registrationNumber: "20123456",
      taxId: "101234567",
    },
  },
  {
    username: "printnovi",
    password: "Stampar2!",
    firstName: "Nikola",
    lastName: "Marić",
    phone: "063 222 3333",
    email: "kontakt@printnovi.rs",
    institution: {
      name: "Print Novi Sad",
      address: "Bulevar oslobođenja 55",
      city: "Novi Sad",
      lat: 45.2517,
      lng: 19.8369,
      registrationNumber: "20234567",
      taxId: "102345678",
    },
  },
  {
    username: "nisprint",
    password: "Stampar3!",
    firstName: "Ana",
    lastName: "Stojanović",
    phone: "063 333 4444",
    email: "office@nisprint.rs",
    institution: {
      name: "Niš Print Centar",
      address: "Obrenovićeva 8",
      city: "Niš",
      lat: 43.3209,
      lng: 21.8958,
      registrationNumber: "20345678",
      taxId: "103456789",
    },
  },
];

/** Fizicka lica - vise njih, da bi broj svidjanja na TOP 5 imao smisla. */
export const FIZICKA_LICA = [
  { username: "pera", password: "Klijent1!", firstName: "Petar", lastName: "Perić", phone: "061 123 4567", email: "pera@gmail.com" },
  { username: "mika", password: "Klijent2!", firstName: "Mihajlo", lastName: "Mikić", phone: "061 987 6543", email: "mika@gmail.com" },
  { username: "ana", password: "Klijent3!", firstName: "Ana", lastName: "Đorđević", phone: "062 111 2233", email: "ana@gmail.com" },
  { username: "stefan", password: "Klijent4!", firstName: "Stefan", lastName: "Pavlović", phone: "062 333 4455", email: "stefan@gmail.com" },
  { username: "milica", password: "Klijent5!", firstName: "Milica", lastName: "Kostić", phone: "064 555 6677", email: "milica@gmail.com" },
  { username: "marko", password: "Klijent6!", firstName: "Marko", lastName: "Simić", phone: "064 777 8899", email: "marko@gmail.com" },
  { username: "tijana", password: "Klijent7!", firstName: "Tijana", lastName: "Ristić", phone: "065 121 3141", email: "tijana@gmail.com" },
  { username: "vuk", password: "Klijent8!", firstName: "Vuk", lastName: "Babić", phone: "065 515 1617", email: "vuk@gmail.com" },
];

export const PRAVNA_LICA = [
  {
    username: "etf",
    password: "Pravno11!",
    firstName: "Marija",
    lastName: "Jovanović",
    phone: "011 321 8300",
    email: "nabavka@etf.rs",
    institution: {
      name: "Elektrotehnički fakultet",
      address: "Bulevar kralja Aleksandra 73",
      city: "Beograd",
      registrationNumber: "07032581",
      taxId: "100251144",
    },
  },
];

/** Nalozi koji cekaju odobrenje - da administratorski ekran ima sta da prikaze. */
export const NA_CEKANJU = [
  {
    username: "novastamparija",
    password: "Cekam123!",
    firstName: "Stefan",
    lastName: "Lukić",
    phone: "064 555 6666",
    email: "stefan@novastamparija.rs",
    type: "PRINTER" as const,
    institution: {
      name: "Nova Štamparija doo",
      address: "Cara Dušana 100",
      city: "Kragujevac",
      registrationNumber: "20456789",
      taxId: "104567890",
    },
  },
  {
    username: "jelena",
    password: "Cekam456!",
    firstName: "Jelena",
    lastName: "Nikolić",
    phone: "061 777 8888",
    email: "jelena@gmail.com",
    type: "CLIENT_INDIVIDUAL" as const,
  },
];

/**
 * Proizvodi. Polje `stampar` je indeks u nizu STAMPARIJE.
 * PR-010 je namerno bez zaliha - tako se vidi da se proizvodi kojih nema na
 * stanju ne pojavljuju u pretrazi, i da im se kategorija ne nudi u listi.
 */
export const PROIZVODI = [
  {
    stampar: 0, code: "PR-001", name: "Pamučna polo majica",
    description: "Kvalitetna pamučna polo majica 180g/m2, pogodna za brendiranje i korporativne uniforme.",
    kategorija: "Kreativne štampe", potkategorija: "Štampa na majicama",
    unitPrice: 1200, stock: 150, boje: ["Bela", "Crna", "Tamno plava", "Siva"],
    usluge: [
      { code: "USL-01", printType: "Direktna štampa na tekstil (DTG)", extraPricePerPiece: 350, maxWidthMm: 300, maxHeightMm: 400 },
      { code: "USL-02", printType: "Preslikač (sito preslikač)", extraPricePerPiece: 200, maxWidthMm: 280, maxHeightMm: 350 },
    ],
  },
  {
    stampar: 0, code: "PR-002", name: "Keramička šolja 330ml",
    description: "Bela keramička šolja visokog sjaja, idealna za sublimacionu štampu visoke rezolucije.",
    kategorija: "Kreativne štampe", potkategorija: "Šolje",
    unitPrice: 320, stock: 500, boje: ["Bela"],
    usluge: [
      { code: "USL-03", printType: "Sublimaciona štampa", extraPricePerPiece: 150, maxWidthMm: 200, maxHeightMm: 85 },
    ],
  },
  {
    stampar: 0, code: "PR-003", name: "Poster A1",
    description: "Poster formata A1 na sjajnom papiru 170g, za izloge i unutrašnje oglašavanje.",
    kategorija: "Štampa velikih formata", potkategorija: "Posteri",
    unitPrice: 650, stock: 300, boje: ["Bela"],
    usluge: [
      { code: "USL-04", printType: "Eko-solventna štampa", extraPricePerPiece: 120, maxWidthMm: 594, maxHeightMm: 841 },
    ],
  },
  {
    stampar: 0, code: "PR-004", name: "Vizit karte 90x50mm",
    description: "Vizit karte na kunsdruku 300g, štampa u punom koloru sa obe strane.",
    kategorija: "Štampa malih formata", potkategorija: "Vizit karte",
    unitPrice: 12, stock: 10000, boje: ["Bela"],
    usluge: [
      { code: "USL-05", printType: "Digitalna štampa", extraPricePerPiece: 4, maxWidthMm: 90, maxHeightMm: 50 },
    ],
  },
  {
    stampar: 1, code: "PR-005", name: "Promotivni roll-up baner 85x200cm",
    description: "Lagan aluminijumski mehanizam sa torbom i štampom na kvalitetnom baner platnu.",
    kategorija: "Štampa velikih formata", potkategorija: "Rollups",
    unitPrice: 4500, stock: 20, boje: ["Bela", "Crna"],
    usluge: [
      { code: "USL-06", printType: "Eko-solventna štampa visoke rezolucije", extraPricePerPiece: 800, maxWidthMm: 850, maxHeightMm: 2000 },
    ],
  },
  {
    stampar: 1, code: "PR-006", name: "Hemijska olovka plastična",
    description: "Plastična hemijska olovka sa ravnom površinom za štampu logotipa.",
    kategorija: "Štampa malih formata", potkategorija: "Olovke",
    unitPrice: 45, stock: 5000, boje: ["Bela", "Plava", "Crvena"],
    usluge: [
      { code: "USL-07", printType: "Tampon štampa", extraPricePerPiece: 15, maxWidthMm: 40, maxHeightMm: 8 },
    ],
  },
  {
    stampar: 1, code: "PR-007", name: "Platnena cegera torba",
    description: "Cegera od prirodnog pamuka, pogodna za promotivnu štampu u jednoj ili dve boje.",
    kategorija: "Kreativne štampe", potkategorija: "Štampa na cegerima",
    unitPrice: 480, stock: 220, boje: ["Bela", "Bež"],
    usluge: [
      { code: "USL-08", printType: "Sito štampa", extraPricePerPiece: 180, maxWidthMm: 250, maxHeightMm: 250 },
    ],
  },
  {
    stampar: 2, code: "PR-008", name: "Duks sa kapuljačom",
    description: "Unisex duks 320g/m2 sa kapuljačom i prednjim džepom.",
    kategorija: "Kreativne štampe", potkategorija: "Štampa na duksevima",
    unitPrice: 2800, stock: 80, boje: ["Crna", "Siva", "Bordo"],
    usluge: [
      { code: "USL-09", printType: "Digitalna FLEKS štampa", extraPricePerPiece: 450, maxWidthMm: 250, maxHeightMm: 300 },
    ],
  },
  {
    stampar: 2, code: "PR-009", name: "Flajer A5",
    description: "Flajer A5 na papiru 135g, štampa u punom koloru sa obe strane.",
    kategorija: "Štampa malih formata", potkategorija: "Flajeri",
    unitPrice: 9, stock: 20000, boje: ["Bela"],
    usluge: [
      { code: "USL-10", printType: "Digitalna štampa", extraPricePerPiece: 3, maxWidthMm: 148, maxHeightMm: 210 },
    ],
  },
  {
    stampar: 2, code: "PR-010", name: "Fototapeta po meri",
    description: "Fototapeta na samolepljivoj podlozi, izrada po dimenzijama zida.",
    kategorija: "Štampa velikih formata", potkategorija: "Fototapete",
    unitPrice: 3200, stock: 0, boje: ["Bela"],
    usluge: [
      { code: "USL-11", printType: "Lateks štampa", extraPricePerPiece: 0, maxWidthMm: 3000, maxHeightMm: 2600 },
    ],
  },

  /*
   * Od ovde nadalje: UPOREDIVI proizvodi kod vise stamparija.
   *
   * Bez njih javna nabavka ne bi imala sta da prikaze - svaka stamparija je
   * imala svoje proizvode koji se ni sa cim ne preklapaju, pa bi na licitaciju
   * izasao po jedan ponudjac i "najniza ponuda" ne bi znacila nista.
   *
   * Zato sada polo majicu, solju i vizit karte nudi svaka od tri stamparije,
   * po razlicitoj ceni. Na odbrani se tako vidi da pobedjuje bas najniza
   * ukupna ponuda, i da onaj kome ponestane na lageru ispada.
   */
  {
    stampar: 1, code: "PR-011", name: "Polo majica pamuk 200g",
    description: "Teža pamučna polo majica, pogodna za radne uniforme.",
    kategorija: "Kreativne štampe", potkategorija: "Štampa na majicama",
    unitPrice: 1320, stock: 90, boje: ["Bela", "Crna", "Teget"],
    usluge: [
      { code: "USL-12", printType: "Direktna štampa na tekstil (DTG)", extraPricePerPiece: 330, maxWidthMm: 300, maxHeightMm: 400 },
    ],
  },
  {
    stampar: 2, code: "PR-012", name: "Polo majica klasik",
    description: "Osnovni model polo majice za veće tiraže.",
    kategorija: "Kreativne štampe", potkategorija: "Štampa na majicama",
    unitPrice: 1150, stock: 40, boje: ["Bela", "Crna"],
    usluge: [
      { code: "USL-13", printType: "Sito štampa", extraPricePerPiece: 220, maxWidthMm: 280, maxHeightMm: 360 },
    ],
  },
  {
    stampar: 1, code: "PR-013", name: "Šolja keramička 330ml",
    description: "Bela keramička šolja, pogodna za sublimacionu štampu.",
    kategorija: "Kreativne štampe", potkategorija: "Šolje",
    unitPrice: 305, stock: 400, boje: ["Bela"],
    usluge: [
      { code: "USL-14", printType: "Sublimaciona štampa", extraPricePerPiece: 140, maxWidthMm: 200, maxHeightMm: 85 },
    ],
  },
  {
    stampar: 2, code: "PR-014", name: "Šolja bela 330",
    description: "Keramička šolja standardne zapremine.",
    kategorija: "Kreativne štampe", potkategorija: "Šolje",
    unitPrice: 290, stock: 25, boje: ["Bela"],
    usluge: [
      { code: "USL-15", printType: "Sublimaciona štampa", extraPricePerPiece: 160, maxWidthMm: 200, maxHeightMm: 85 },
    ],
  },
  {
    stampar: 1, code: "PR-015", name: "Vizit karte 90x50",
    description: "Obostrana digitalna štampa na kartonu 300g.",
    kategorija: "Štampa malih formata", potkategorija: "Vizit karte",
    unitPrice: 11, stock: 5000, boje: ["Bela"],
    usluge: [
      { code: "USL-16", printType: "Digitalna štampa", extraPricePerPiece: 3, maxWidthMm: 90, maxHeightMm: 50 },
    ],
  },
  {
    stampar: 2, code: "PR-016", name: "Vizit karta standard",
    description: "Jednostrana štampa, karton 250g.",
    kategorija: "Štampa malih formata", potkategorija: "Vizit karte",
    unitPrice: 9, stock: 3000, boje: ["Bela"],
    usluge: [
      { code: "USL-17", printType: "Digitalna štampa", extraPricePerPiece: 3, maxWidthMm: 90, maxHeightMm: 50 },
    ],
  },
];

/**
 * Ocene: sifra proizvoda -> koliko svidjanja i nesvidjanja.
 * Rasporedjene su kroz vreme u samom skriptu, da bi kasniji linijski grafikon
 * imao smislenu istoriju.
 */
export const OCENE: { code: string; svidjanja: number; nesvidjanja: number }[] = [
  { code: "PR-001", svidjanja: 7, nesvidjanja: 1 },
  { code: "PR-002", svidjanja: 5, nesvidjanja: 0 },
  { code: "PR-006", svidjanja: 4, nesvidjanja: 2 },
  { code: "PR-008", svidjanja: 3, nesvidjanja: 1 },
  { code: "PR-004", svidjanja: 2, nesvidjanja: 0 },
  { code: "PR-005", svidjanja: 1, nesvidjanja: 1 },
  { code: "PR-007", svidjanja: 1, nesvidjanja: 0 },
];
