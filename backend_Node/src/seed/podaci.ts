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
  {
    username: "artprint",
    password: "Stampar4!",
    firstName: "Marina",
    lastName: "Vasić",
    phone: "063 444 5555",
    email: "studio@artprint.rs",
    institution: {
      name: "Art Print Studio",
      address: "Kneza Miloša 22",
      city: "Kragujevac",
      lat: 44.0128,
      lng: 20.9114,
      registrationNumber: "20567891",
      taxId: "105678901",
    },
  },
  {
    username: "suboticaprint",
    password: "Stampar5!",
    firstName: "Luka",
    lastName: "Kovač",
    phone: "063 555 6666",
    email: "info@suboticaprint.rs",
    institution: {
      name: "Subotica Print Lab",
      address: "Korzo 18",
      city: "Subotica",
      lat: 46.1004,
      lng: 19.6676,
      registrationNumber: "20678912",
      taxId: "106789012",
    },
  },
  {
    username: "uzicegraf",
    password: "Stampar6!",
    firstName: "Tamara",
    lastName: "Radović",
    phone: "063 666 7777",
    email: "kontakt@uzicegraf.rs",
    institution: {
      name: "Užice Graf",
      address: "Dimitrija Tucovića 9",
      city: "Užice",
      lat: 43.8583,
      lng: 19.8425,
      registrationNumber: "20789123",
      taxId: "107891234",
    },
  },
  {
    username: "zrenjaninstampa",
    password: "Stampar7!",
    firstName: "Igor",
    lastName: "Đurić",
    phone: "063 777 8888",
    email: "radnja@zrenjaninstampa.rs",
    institution: {
      name: "Zrenjanin Štampa",
      address: "Kralja Aleksandra I 31",
      city: "Zrenjanin",
      lat: 45.3835,
      lng: 20.3893,
      registrationNumber: "20891234",
      taxId: "108912345",
    },
  },
  {
    username: "valjevoink",
    password: "Stampar8!",
    firstName: "Katarina",
    lastName: "Milošević",
    phone: "063 888 9999",
    email: "hello@valjevoink.rs",
    institution: {
      name: "Valjevo Ink",
      address: "Vuka Karadžića 41",
      city: "Valjevo",
      lat: 44.2751,
      lng: 19.8982,
      registrationNumber: "20912345",
      taxId: "109123456",
    },
  },
  {
    username: "vrsacmedia",
    password: "Stampar9!",
    firstName: "Nemanja",
    lastName: "Popov",
    phone: "063 999 0000",
    email: "studio@vrsacmedia.rs",
    institution: {
      name: "Vršac Media Print",
      address: "Žarka Zrenjanina 12",
      city: "Vršac",
      lat: 45.1193,
      lng: 21.3038,
      registrationNumber: "21023456",
      taxId: "110234567",
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
  { username: "maja", password: "Klijent9!", firstName: "Maja", lastName: "Stanković", phone: "065 222 3344", email: "maja@gmail.com" },
  { username: "nikola", password: "Klijent10!", firstName: "Nikola", lastName: "Janković", phone: "066 111 2233", email: "nikola@gmail.com" },
  { username: "ivana", password: "Klijent11!", firstName: "Ivana", lastName: "Marković", phone: "066 333 4455", email: "ivana@gmail.com" },
  { username: "bojan", password: "Klijent12!", firstName: "Bojan", lastName: "Tomić", phone: "066 555 6677", email: "bojan@gmail.com" },
  { username: "sara", password: "Klijent13!", firstName: "Sara", lastName: "Lazarević", phone: "066 777 8899", email: "sara@gmail.com" },
  { username: "filip", password: "Klijent14!", firstName: "Filip", lastName: "Knežević", phone: "060 111 2223", email: "filip@gmail.com" },
  { username: "nina", password: "Klijent15!", firstName: "Nina", lastName: "Arsenijević", phone: "060 333 4445", email: "nina@gmail.com" },
  { username: "andrej", password: "Klijent16!", firstName: "Andrej", lastName: "Matić", phone: "060 555 6667", email: "andrej@gmail.com" },
  { username: "teodora", password: "Klijent17!", firstName: "Teodora", lastName: "Pantić", phone: "060 777 8889", email: "teodora@gmail.com" },
  { username: "ognjen", password: "Klijent18!", firstName: "Ognjen", lastName: "Vuković", phone: "061 222 3334", email: "ognjen@gmail.com" },
  { username: "jovana", password: "Klijent19!", firstName: "Jovana", lastName: "Rakić", phone: "061 444 5556", email: "jovana.rakic@gmail.com" },
  { username: "dunja", password: "Klijent20!", firstName: "Dunja", lastName: "Savić", phone: "061 666 7778", email: "dunja@gmail.com" },
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
  {
    username: "startit",
    password: "Pravno22!",
    firstName: "Miloš",
    lastName: "Pavlović",
    phone: "011 555 1200",
    email: "nabavka@startit.rs",
    institution: {
      name: "Start IT doo",
      address: "Bulevar despota Stefana 12",
      city: "Beograd",
      registrationNumber: "21134567",
      taxId: "111345678",
    },
  },
  {
    username: "kulturacentar",
    password: "Pravno33!",
    firstName: "Jelena",
    lastName: "Jelić",
    phone: "021 444 2200",
    email: "javnenabavke@kulturacentar.rs",
    institution: {
      name: "Kulturni centar Novi Sad",
      address: "Katolička porta 5",
      city: "Novi Sad",
      registrationNumber: "21245678",
      taxId: "112456789",
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
  {
    username: "brzaprinta",
    password: "Cekam789!",
    firstName: "Miloš",
    lastName: "Zarić",
    phone: "064 111 2233",
    email: "milos@brzaprinta.rs",
    type: "PRINTER" as const,
    institution: {
      name: "Brza Printa doo",
      address: "Bulevar Evrope 40",
      city: "Novi Sad",
      registrationNumber: "21356789",
      taxId: "113567891",
    },
  },
  { username: "marija", password: "Cekam012!", firstName: "Marija", lastName: "Knežević", phone: "062 222 3344", email: "marija.k@gmail.com", type: "CLIENT_INDIVIDUAL" as const },
  { username: "dalibor", password: "Cekam345!", firstName: "Dalibor", lastName: "Mandić", phone: "062 444 5566", email: "dalibor@gmail.com", type: "CLIENT_INDIVIDUAL" as const },
  {
    username: "skolaplus",
    password: "Cekam678!",
    firstName: "Sofija",
    lastName: "Mitić",
    phone: "018 333 4455",
    email: "sekretar@skolaplus.rs",
    type: "CLIENT_COMPANY" as const,
    institution: {
      name: "Škola Plus doo",
      address: "Generala Milojka Lešjanina 10",
      city: "Niš",
      registrationNumber: "21467891",
      taxId: "114678912",
    },
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
  { stampar: 3, code: "PR-017", name: "Zahvalnica A6 na reljefnom papiru", description: "Elegantna zahvalnica na teksturiranom papiru za događaje i poslovne poklone.", kategorija: "Štampa malih formata", potkategorija: "Zahvalnice", unitPrice: 38, stock: 1600, boje: ["Bela", "Krem"], usluge: [{ code: "USL-18", printType: "Digitalna štampa", extraPricePerPiece: 8, maxWidthMm: 105, maxHeightMm: 148 }] },
  { stampar: 3, code: "PR-018", name: "Pozivnica sa preklopom", description: "Dvostrana pozivnica sa preklopom, za proslave i konferencije.", kategorija: "Štampa malih formata", potkategorija: "Pozivnice", unitPrice: 72, stock: 900, boje: ["Bela", "Krem"], usluge: [{ code: "USL-19", printType: "Digitalna štampa sa zlatotiskom", extraPricePerPiece: 25, maxWidthMm: 105, maxHeightMm: 148 }] },
  { stampar: 3, code: "PR-019", name: "Poster A2 mat", description: "Poster A2 na mat papiru za izloge, kancelarije i kulturne događaje.", kategorija: "Štampa velikih formata", potkategorija: "Posteri", unitPrice: 390, stock: 450, boje: ["Bela"], usluge: [{ code: "USL-20", printType: "Pigmentna štampa", extraPricePerPiece: 90, maxWidthMm: 420, maxHeightMm: 594 }] },
  { stampar: 3, code: "PR-020", name: "Šolja sa obojenom unutrašnjošću", description: "Keramička šolja 330ml sa obojenim detaljem i sublimacionom štampom.", kategorija: "Kreativne štampe", potkategorija: "Šolje", unitPrice: 390, stock: 260, boje: ["Bela", "Crvena", "Plava"], usluge: [{ code: "USL-21", printType: "Sublimaciona štampa", extraPricePerPiece: 160, maxWidthMm: 200, maxHeightMm: 85 }] },
  { stampar: 3, code: "PR-021", name: "Pamučna majica kratkih rukava", description: "Unisex majica 180g za promotivnu i timsku štampu.", kategorija: "Kreativne štampe", potkategorija: "Štampa na majicama", unitPrice: 980, stock: 320, boje: ["Bela", "Crna", "Maslinasta"], usluge: [{ code: "USL-22", printType: "DTG štampa", extraPricePerPiece: 300, maxWidthMm: 300, maxHeightMm: 400 }] },
  { stampar: 3, code: "PR-022", name: "A4 fascikla sa džepom", description: "Kartonska fascikla sa unutrašnjim džepom za konferencijski materijal.", kategorija: "Štampa malih formata", potkategorija: "Fascikle", unitPrice: 110, stock: 1100, boje: ["Bela"], usluge: [{ code: "USL-23", printType: "Ofset štampa", extraPricePerPiece: 18, maxWidthMm: 210, maxHeightMm: 297 }] },

  { stampar: 4, code: "PR-023", name: "Reciklirana hemijska olovka", description: "Olovka od recikliranog kartona za održive promotivne kampanje.", kategorija: "Štampa malih formata", potkategorija: "Olovke", unitPrice: 62, stock: 3600, boje: ["Kraft", "Crna", "Plava"], usluge: [{ code: "USL-24", printType: "Tampon štampa", extraPricePerPiece: 18, maxWidthMm: 45, maxHeightMm: 8 }] },
  { stampar: 4, code: "PR-024", name: "Flajer DL sjaj", description: "Promotivni flajer DL u punom koloru, obostrano štampan.", kategorija: "Štampa malih formata", potkategorija: "Flajeri", unitPrice: 11, stock: 14000, boje: ["Bela"], usluge: [{ code: "USL-25", printType: "Ofset štampa", extraPricePerPiece: 3, maxWidthMm: 99, maxHeightMm: 210 }] },
  { stampar: 4, code: "PR-025", name: "Roll-up premium 100x200cm", description: "Premium roll-up sistem sa širokom bazom i zaštitnom torbom.", kategorija: "Štampa velikih formata", potkategorija: "Rollups", unitPrice: 5900, stock: 14, boje: ["Bela", "Crna"], usluge: [{ code: "USL-26", printType: "Eko-solventna štampa", extraPricePerPiece: 900, maxWidthMm: 1000, maxHeightMm: 2000 }] },
  { stampar: 4, code: "PR-026", name: "Platneni ceger sa dugim ručkama", description: "Prostran pamučni ceger za festivale i maloprodajne brendove.", kategorija: "Kreativne štampe", potkategorija: "Štampa na cegerima", unitPrice: 520, stock: 380, boje: ["Bež", "Crna"], usluge: [{ code: "USL-27", printType: "Sito štampa u dve boje", extraPricePerPiece: 220, maxWidthMm: 280, maxHeightMm: 280 }] },
  { stampar: 4, code: "PR-027", name: "Duks bez kapuljače", description: "Pamuk i poliester 280g, spreman za štampu preko grudi.", kategorija: "Kreativne štampe", potkategorija: "Štampa na duksevima", unitPrice: 2450, stock: 95, boje: ["Siva", "Crna", "Bordo"], usluge: [{ code: "USL-28", printType: "FLEKS štampa", extraPricePerPiece: 390, maxWidthMm: 260, maxHeightMm: 320 }] },
  { stampar: 4, code: "PR-028", name: "Vizit karte sa plastifikacijom", description: "Vizit karte na 350g kartonu sa mat plastifikacijom.", kategorija: "Štampa malih formata", potkategorija: "Vizit karte", unitPrice: 16, stock: 7200, boje: ["Bela"], usluge: [{ code: "USL-29", printType: "Digitalna štampa", extraPricePerPiece: 5, maxWidthMm: 90, maxHeightMm: 50 }] },

  { stampar: 5, code: "PR-029", name: "Fototapeta vinil premium", description: "Periva vinilna fototapeta otporna na UV svetlo, po meri zida.", kategorija: "Štampa velikih formata", potkategorija: "Fototapete", unitPrice: 3600, stock: 65, boje: ["Bela"], usluge: [{ code: "USL-30", printType: "Lateks štampa", extraPricePerPiece: 0, maxWidthMm: 3000, maxHeightMm: 2600 }] },
  { stampar: 5, code: "PR-030", name: "Poster A0 za izlog", description: "Veliki poster A0 na papiru 150g za upadljive promotivne poruke.", kategorija: "Štampa velikih formata", potkategorija: "Posteri", unitPrice: 1200, stock: 140, boje: ["Bela"], usluge: [{ code: "USL-31", printType: "Eko-solventna štampa", extraPricePerPiece: 180, maxWidthMm: 841, maxHeightMm: 1189 }] },
  { stampar: 5, code: "PR-031", name: "Svečana zahvalnica A5", description: "Zahvalnica na debelom papiru sa mogućnošću personalizacije.", kategorija: "Štampa malih formata", potkategorija: "Zahvalnice", unitPrice: 48, stock: 1300, boje: ["Bela", "Krem"], usluge: [{ code: "USL-32", printType: "Digitalna štampa", extraPricePerPiece: 10, maxWidthMm: 148, maxHeightMm: 210 }] },
  { stampar: 5, code: "PR-032", name: "Keramička šolja latte", description: "Visoka šolja od 450ml za foto i korporativnu štampu.", kategorija: "Kreativne štampe", potkategorija: "Šolje", unitPrice: 470, stock: 180, boje: ["Bela"], usluge: [{ code: "USL-33", printType: "Sublimaciona štampa", extraPricePerPiece: 190, maxWidthMm: 210, maxHeightMm: 110 }] },
  { stampar: 5, code: "PR-033", name: "Majica za sportski tim", description: "Tehnička majica za timsku i sportsku sublimacionu štampu.", kategorija: "Kreativne štampe", potkategorija: "Štampa na majicama", unitPrice: 1350, stock: 210, boje: ["Bela", "Plava", "Crvena"], usluge: [{ code: "USL-34", printType: "Sublimaciona štampa", extraPricePerPiece: 420, maxWidthMm: 320, maxHeightMm: 420 }] },
  { stampar: 5, code: "PR-034", name: "Poklon ceger od jute", description: "Čvrst ceger od jute sa širokom površinom za brendiranje.", kategorija: "Kreativne štampe", potkategorija: "Štampa na cegerima", unitPrice: 760, stock: 120, boje: ["Prirodna"], usluge: [{ code: "USL-35", printType: "Sito štampa", extraPricePerPiece: 250, maxWidthMm: 260, maxHeightMm: 260 }] },

  { stampar: 6, code: "PR-035", name: "Pozivnica za venčanje", description: "Pozivnica sa kovertom i personalizovanim imenima mladenaca.", kategorija: "Štampa malih formata", potkategorija: "Pozivnice", unitPrice: 95, stock: 700, boje: ["Bela", "Krem", "Puder roze"], usluge: [{ code: "USL-36", printType: "Digitalna štampa sa folijom", extraPricePerPiece: 35, maxWidthMm: 105, maxHeightMm: 148 }] },
  { stampar: 6, code: "PR-036", name: "Fascikla sa gumicom", description: "Tvrđa A4 fascikla sa elastičnom gumicom za dokumentaciju.", kategorija: "Štampa malih formata", potkategorija: "Fascikle", unitPrice: 145, stock: 640, boje: ["Bela", "Crna"], usluge: [{ code: "USL-37", printType: "Ofset štampa", extraPricePerPiece: 22, maxWidthMm: 210, maxHeightMm: 297 }] },
  { stampar: 6, code: "PR-037", name: "Flajer A6 ekonomičan", description: "Ekonomičan flajer A6 za masovne promotivne akcije.", kategorija: "Štampa malih formata", potkategorija: "Flajeri", unitPrice: 6, stock: 30000, boje: ["Bela"], usluge: [{ code: "USL-38", printType: "Ofset štampa", extraPricePerPiece: 2, maxWidthMm: 105, maxHeightMm: 148 }] },
  { stampar: 6, code: "PR-038", name: "Roll-up za sajamski nastup", description: "Standardni roll-up sa torbom, za česte sajamske nastupe.", kategorija: "Štampa velikih formata", potkategorija: "Rollups", unitPrice: 4100, stock: 28, boje: ["Bela", "Siva"], usluge: [{ code: "USL-39", printType: "Eko-solventna štampa", extraPricePerPiece: 720, maxWidthMm: 850, maxHeightMm: 2000 }] },
  { stampar: 6, code: "PR-039", name: "Duks dečji", description: "Mekan dečji duks za škole, klubove i rođendanske poklone.", kategorija: "Kreativne štampe", potkategorija: "Štampa na duksevima", unitPrice: 2100, stock: 70, boje: ["Plava", "Roze", "Siva"], usluge: [{ code: "USL-40", printType: "DTF štampa", extraPricePerPiece: 340, maxWidthMm: 220, maxHeightMm: 280 }] },
  { stampar: 6, code: "PR-040", name: "Keramička šolja sa kašičicom", description: "Poklon šolja sa keramičkom kašičicom u kompletu.", kategorija: "Kreativne štampe", potkategorija: "Šolje", unitPrice: 520, stock: 140, boje: ["Bela", "Crvena"], usluge: [{ code: "USL-41", printType: "Sublimaciona štampa", extraPricePerPiece: 200, maxWidthMm: 200, maxHeightMm: 85 }] },

  { stampar: 7, code: "PR-041", name: "Olovka metalna gravirana", description: "Metalna hemijska olovka sa laserski graviranim logotipom.", kategorija: "Štampa malih formata", potkategorija: "Olovke", unitPrice: 180, stock: 840, boje: ["Srebrna", "Crna", "Plava"], usluge: [{ code: "USL-42", printType: "Laserska gravura", extraPricePerPiece: 35, maxWidthMm: 45, maxHeightMm: 8 }] },
  { stampar: 7, code: "PR-042", name: "Vizit karte soft touch", description: "Luksuzne vizit karte sa baršunastom plastifikacijom.", kategorija: "Štampa malih formata", potkategorija: "Vizit karte", unitPrice: 24, stock: 4200, boje: ["Bela", "Crna"], usluge: [{ code: "USL-43", printType: "Digitalna štampa", extraPricePerPiece: 8, maxWidthMm: 90, maxHeightMm: 50 }] },
  { stampar: 7, code: "PR-043", name: "Fototapeta tekstura betona", description: "Fototapeta sa teksturom betona za enterijere i poslovne prostore.", kategorija: "Štampa velikih formata", potkategorija: "Fototapete", unitPrice: 3400, stock: 40, boje: ["Bela"], usluge: [{ code: "USL-44", printType: "Lateks štampa", extraPricePerPiece: 0, maxWidthMm: 3000, maxHeightMm: 2600 }] },
  { stampar: 7, code: "PR-044", name: "Pamučni ceger prirodni", description: "Jednostavan prirodni ceger za svakodnevnu promotivnu upotrebu.", kategorija: "Kreativne štampe", potkategorija: "Štampa na cegerima", unitPrice: 430, stock: 540, boje: ["Prirodna", "Crna"], usluge: [{ code: "USL-45", printType: "Sito štampa", extraPricePerPiece: 160, maxWidthMm: 250, maxHeightMm: 250 }] },
  { stampar: 7, code: "PR-045", name: "Majica polo ženska", description: "Ženska polo majica za uniforme, konferencije i promocije.", kategorija: "Kreativne štampe", potkategorija: "Štampa na majicama", unitPrice: 1180, stock: 170, boje: ["Bela", "Teget", "Crvena"], usluge: [{ code: "USL-46", printType: "DTG štampa", extraPricePerPiece: 330, maxWidthMm: 280, maxHeightMm: 360 }] },
  { stampar: 7, code: "PR-046", name: "Poster B1 foto kvalitet", description: "Poster B1 sa bogatim bojama za izložbe i foto prezentacije.", kategorija: "Štampa velikih formata", potkategorija: "Posteri", unitPrice: 780, stock: 190, boje: ["Bela"], usluge: [{ code: "USL-47", printType: "Foto štampa", extraPricePerPiece: 150, maxWidthMm: 700, maxHeightMm: 1000 }] },

  { stampar: 8, code: "PR-047", name: "Flajer kvadratni 15x15", description: "Kvadratni flajer za restorane, galerije i društvene mreže.", kategorija: "Štampa malih formata", potkategorija: "Flajeri", unitPrice: 14, stock: 8200, boje: ["Bela"], usluge: [{ code: "USL-48", printType: "Digitalna štampa", extraPricePerPiece: 4, maxWidthMm: 150, maxHeightMm: 150 }] },
  { stampar: 8, code: "PR-048", name: "Zahvalnica sa QR kodom", description: "Zahvalnica sa promenljivim QR kodom za digitalne kampanje.", kategorija: "Štampa malih formata", potkategorija: "Zahvalnice", unitPrice: 42, stock: 1900, boje: ["Bela"], usluge: [{ code: "USL-49", printType: "Digitalna štampa", extraPricePerPiece: 9, maxWidthMm: 105, maxHeightMm: 148 }] },
  { stampar: 8, code: "PR-049", name: "Roll-up dvostrani", description: "Dvostrani roll-up za prolaze i prostore sa velikim protokom ljudi.", kategorija: "Štampa velikih formata", potkategorija: "Rollups", unitPrice: 7200, stock: 8, boje: ["Bela", "Crna"], usluge: [{ code: "USL-50", printType: "Eko-solventna štampa", extraPricePerPiece: 1100, maxWidthMm: 850, maxHeightMm: 2000 }] },
  { stampar: 8, code: "PR-050", name: "Šolja magična crna", description: "Termoosetljiva crna šolja koja otkriva otisak pri sipanju toplog napitka.", kategorija: "Kreativne štampe", potkategorija: "Šolje", unitPrice: 590, stock: 90, boje: ["Crna"], usluge: [{ code: "USL-51", printType: "Sublimaciona štampa", extraPricePerPiece: 220, maxWidthMm: 200, maxHeightMm: 85 }] },
  { stampar: 8, code: "PR-051", name: "Duks oversize", description: "Oversize duks od 340g za streetwear i kreativne brendove.", kategorija: "Kreativne štampe", potkategorija: "Štampa na duksevima", unitPrice: 3200, stock: 55, boje: ["Crna", "Krem", "Maslinasta"], usluge: [{ code: "USL-52", printType: "DTF štampa", extraPricePerPiece: 480, maxWidthMm: 300, maxHeightMm: 400 }] },
  { stampar: 8, code: "PR-052", name: "Fascikla eko karton", description: "Ekološka fascikla od recikliranog kartona za konferencije.", kategorija: "Štampa malih formata", potkategorija: "Fascikle", unitPrice: 90, stock: 0, boje: ["Kraft"], usluge: [{ code: "USL-53", printType: "Jednobojna štampa", extraPricePerPiece: 12, maxWidthMm: 210, maxHeightMm: 297 }] },
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
  { code: "PR-017", svidjanja: 6, nesvidjanja: 1 },
  { code: "PR-020", svidjanja: 8, nesvidjanja: 2 },
  { code: "PR-025", svidjanja: 5, nesvidjanja: 1 },
  { code: "PR-029", svidjanja: 4, nesvidjanja: 2 },
  { code: "PR-035", svidjanja: 7, nesvidjanja: 0 },
  { code: "PR-041", svidjanja: 3, nesvidjanja: 1 },
  { code: "PR-049", svidjanja: 2, nesvidjanja: 1 },
  { code: "PR-050", svidjanja: 6, nesvidjanja: 3 },
];
