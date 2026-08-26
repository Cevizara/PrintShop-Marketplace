/**
 * Kreiranje i popunjavanje baze podataka.
 *
 * Tekst zadatka trazi da se baza kreira i popunjava NEZAVISNO od aplikacije,
 * pa je ovo zaseban skript koji se pokrece rucno:
 *
 *     npm run seed
 *
 * Aplikacija (server.ts) ima iskljucen autoCreate i autoIndex - ona se samo
 * povezuje na vec postojecu bazu. Kolekcije i indekse pravi iskljucivo ovaj skript.
 *
 * Radi nad bazom printing_house_v2. Stara baza printing_house se ne dira.
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env";
import { napraviAvatare, napraviUzorkeSlika } from "./slike";
import {
  FIZICKA_LICA,
  KATEGORIJE,
  NA_CEKANJU,
  OCENE,
  PRAVNA_LICA,
  PROIZVODI,
  STAMPARIJE,
} from "./podaci";

const KOMENTARI = [
  "Kvalitet je bolji nego što sam očekivao za ovu cenu.",
  "Isporuka je stigla na vreme, štampa je oštra i postojana.",
  "Boje su malo tamnije nego na slici, ali sve u svemu korektno.",
  "Naručivali smo za ceo tim, svi su zadovoljni.",
  "Materijal je solidan, prati opis.",
];

const KOLEKCIJE = [
  "users",
  "categories",
  "products",
  "ratings",
  "password_resets",
  "carts",
  "invoices",
  // Brojac faktura. Kolekcija se pravi ovde, iako je prvi $inc sam pravi -
  // aplikacija ima iskljucen autoCreate, pa se sve kolekcije prave iskljucivo
  // ovim skriptom, kako trazi tekst zadatka.
  "counters",
  "procurements",
  "bids",
];

const oid = () => new mongoose.Types.ObjectId();
const hes = (lozinka: string) => bcrypt.hashSync(lozinka, 10);

const SADA = Date.now();
const danaRanije = (n: number) => new Date(SADA - n * 24 * 60 * 60 * 1000);

async function main(): Promise<void> {
  await mongoose.connect(env.mongoUri);
  const baza = mongoose.connection.db!;

  console.log("Baza:", env.mongoUri);

  // 1) Ciscenje -------------------------------------------------------------
  for (const postojeca of await baza.listCollections().toArray()) {
    await baza.dropCollection(postojeca.name);
  }

  // 2) Kolekcije ------------------------------------------------------------
  for (const naziv of KOLEKCIJE) {
    await baza.createCollection(naziv);
  }
  console.log("Kolekcije:", KOLEKCIJE.join(", "));

  // 3) Indeksi --------------------------------------------------------------
  await baza.collection("users").createIndexes([
    // Jedinstvenost koju trazi tekst zadatka. Provere postoje i u kontroleru
    // radi lepe poruke, ali garanciju daju bas ovi indeksi.
    { key: { username: 1 }, unique: true, name: "uniq_username" },
    { key: { email: 1 }, unique: true, name: "uniq_email" },
    {
      key: { "institution.registrationNumber": 1 },
      unique: true,
      // sparse: fizicka lica nemaju institution, pa ih indeks preskace.
      // Bez ovoga bi drugo fizicko lice palo na "duplicate null".
      sparse: true,
      name: "uniq_maticni_broj",
    },
    { key: { "institution.taxId": 1 }, unique: true, sparse: true, name: "uniq_pib" },

    // Administratorski pregled trazi retku vrednost (PENDING) u polju sa malo
    // razlicitih vrednosti - tu indeks najvise dobija.
    { key: { status: 1 }, name: "idx_status" },
    { key: { type: 1, status: 1 }, name: "idx_tip_status" },
  ]);

  await baza.collection("products").createIndexes([
    // Isti stampar ne sme dvaput uneti proizvod sa istom sifrom.
    { key: { printerId: 1, code: 1 }, unique: true, name: "uniq_stampar_sifra" },
    // Pretraga po kategoriji i lista kategorija "koje imaju proizvoda na stanju".
    { key: { categoryName: 1, stock: 1 }, name: "idx_kategorija_stanje" },
    { key: { name: 1 }, name: "idx_naziv" },
  ]);

  await baza.collection("ratings").createIndexes([
    // Jedan klijent - najvise jedna ocena po proizvodu.
    { key: { productId: 1, userId: 1 }, unique: true, name: "uniq_proizvod_korisnik" },
    // TOP 5 i brojaci na strani sa detaljima.
    { key: { productId: 1, value: 1 }, name: "idx_proizvod_ocena" },
    { key: { createdAt: 1 }, name: "idx_datum" },
  ]);

  await baza.collection("password_resets").createIndexes([
    { key: { token: 1 }, unique: true, name: "uniq_token" },
    // TTL indeks: Mongo sam brise zapise kojima je proslo vreme isteka.
    // Ovo NIJE provera roka - rok proverava kontroler pri svakoj upotrebi
    // tokena. Ovo samo sprecava da se istekli zapisi beskonacno gomilaju.
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "ttl_istek" },
  ]);

  await baza.collection("carts").createIndexes([
    // Jedna korpa po klijentu. Tekst zadatka govori o "trenutnoj elektronskoj
    // korpi" - jednoj, ne o vise njih.
    { key: { clientId: 1 }, unique: true, name: "uniq_klijent" },
  ]);

  await baza.collection("invoices").createIndexes([
    // Broj fakture je jedinstven. Brojac ga vec pravi atomicno, ali indeks je
    // poslednja brana - i jedina koja vazi i ako neko upise fakturu mimo koda.
    { key: { number: 1 }, unique: true, name: "uniq_broj_fakture" },
    // Tabela narudzbina klijenta: njegove fakture, najnovije prve.
    { key: { clientId: 1, createdAt: -1 }, name: "idx_klijent_datum" },
    // Stamparski pregled naruceniih proizvoda, filtriran po statusu.
    { key: { printerId: 1, status: 1 }, name: "idx_stampar_status" },
    // Arhiva proizvoda: fakture u statusima isporuceno i primljeno.
    { key: { clientId: 1, status: 1 }, name: "idx_klijent_status" },
  ]);

  await baza.collection("procurements").createIndexes([
    { key: { number: 1 }, unique: true, name: "uniq_broj_nabavke" },
    // Spisak ustanove, najnovije prvo.
    { key: { clientId: 1, createdAt: -1 }, name: "idx_ustanova_datum" },
    // Otvorene nabavke koje stampar vidi, i lenjo zakljucivanje isteklih.
    { key: { status: 1, deadline: 1 }, name: "idx_status_rok" },
  ]);

  await baza.collection("bids").createIndexes([
    // Tekst zadatka: stampar salje JEDNU ponudu po javnoj nabavci.
    { key: { procurementId: 1, printerId: 1 }, unique: true, name: "uniq_nabavka_stampar" },
    // Zakljucivanje uzima ponude poredjane po ukupnom iznosu.
    { key: { procurementId: 1, total: 1 }, name: "idx_nabavka_iznos" },
    { key: { printerId: 1, createdAt: -1 }, name: "idx_stampar_datum" },
  ]);

  console.log("Indeksi kreirani.");

  // 4) Kategorije -----------------------------------------------------------
  const kategorije = KATEGORIJE.map((k) => ({
    _id: oid(),
    name: k.name,
    subcategories: k.subcategories.map((naziv) => ({ _id: oid(), name: naziv })),
  }));

  await baza.collection("categories").insertMany(kategorije as never[]);

  const kategorijaPoNazivu = (naziv: string) => {
    const nadjena = kategorije.find((k) => k.name === naziv);
    if (!nadjena) throw new Error("Nepoznata kategorija u podacima: " + naziv);
    return nadjena;
  };

  // 5) Korisnici ------------------------------------------------------------
  // Avatari se prave unapred, da bi svaki nalog imao svoju sliku. Nalozi koji
  // cekaju odobrenje ih namerno nemaju - oni ostaju na podrazumevanoj slici,
  // da se na odbrani vidi i taj slucaj.
  const avatari = napraviAvatare([
    { username: "admin", firstName: "Milan", lastName: "Petrović" },
    ...STAMPARIJE,
    ...FIZICKA_LICA,
    ...PRAVNA_LICA,
  ]);

  const administrator = {
    _id: oid(),
    username: "admin",
    password: hes("Admin123!"),
    firstName: "Milan",
    lastName: "Petrović",
    phone: "064 123 4567",
    email: "admin@printinghouse.rs",
    profileImage: avatari["admin"],
    type: "ADMIN",
    status: "APPROVED",
    createdAt: danaRanije(200),
  };

  const stamparije = STAMPARIJE.map((s, redni) => ({
    _id: oid(),
    username: s.username,
    password: hes(s.password),
    firstName: s.firstName,
    lastName: s.lastName,
    phone: s.phone,
    email: s.email,
    profileImage: avatari[s.username],
    type: "PRINTER",
    status: "APPROVED",
    institution: s.institution,
    createdAt: danaRanije(180 - redni * 6),
  }));

  const fizickaLica = FIZICKA_LICA.map((k, redni) => ({
    _id: oid(),
    username: k.username,
    password: hes(k.password),
    firstName: k.firstName,
    lastName: k.lastName,
    phone: k.phone,
    email: k.email,
    profileImage: avatari[k.username],
    type: "CLIENT_INDIVIDUAL",
    status: "APPROVED",
    createdAt: danaRanije(140 - redni * 8),
  }));

  const pravnaLica = PRAVNA_LICA.map((k) => ({
    _id: oid(),
    username: k.username,
    password: hes(k.password),
    firstName: k.firstName,
    lastName: k.lastName,
    phone: k.phone,
    email: k.email,
    profileImage: avatari[k.username],
    type: "CLIENT_COMPANY",
    status: "APPROVED",
    institution: k.institution,
    createdAt: danaRanije(90),
  }));

  const naCekanju = NA_CEKANJU.map((k, redni) => ({
    _id: oid(),
    username: k.username,
    password: hes(k.password),
    firstName: k.firstName,
    lastName: k.lastName,
    phone: k.phone,
    email: k.email,
    profileImage: "default_profile_image.jpg",
    type: k.type,
    status: "PENDING",
    institution: "institution" in k ? k.institution : undefined,
    createdAt: danaRanije(3 - redni),
  }));

  await baza
    .collection("users")
    .insertMany([administrator, ...stamparije, ...fizickaLica, ...pravnaLica, ...naCekanju] as never[]);

  // 6) Slike ----------------------------------------------------------------
  const slike = napraviUzorkeSlika(
    PROIZVODI.map((p) => ({ code: p.code, name: p.name, potkategorija: p.potkategorija }))
  );

  // 7) Proizvodi ------------------------------------------------------------
  const proizvodi = PROIZVODI.map((p, redni) => {
    const kategorija = kategorijaPoNazivu(p.kategorija);

    return {
      _id: oid(),
      printerId: stamparije[p.stampar]._id,
      code: p.code,
      name: p.name,
      description: p.description,
      categoryId: kategorija._id,
      categoryName: kategorija.name,
      subcategoryName: p.potkategorija,
      unitPrice: p.unitPrice,
      stock: p.stock,
      availableColors: p.boje,
      mainImage: slike[p.code].glavna,
      additionalImages: slike[p.code].dodatne,
      printServices: p.usluge.map((u) => ({ _id: oid(), ...u })),
      createdAt: danaRanije(150 - redni * 4),
    };
  });

  await baza.collection("products").insertMany(proizvodi as never[]);

  // 8) Ocene ----------------------------------------------------------------
  // Rasporedjene kroz vreme i po razlicitim klijentima, jer jedan klijent sme
  // imati najvise jednu ocenu po proizvodu.
  const ocene: unknown[] = [];

  for (const stavka of OCENE) {
    const proizvod = proizvodi.find((p) => p.code === stavka.code)!;
    const ukupno = stavka.svidjanja + stavka.nesvidjanja;

    if (ukupno > fizickaLica.length) {
      throw new Error(
        `Proizvod ${stavka.code} trazi ${ukupno} ocena, a ima samo ${fizickaLica.length} klijenata.`
      );
    }

    for (let i = 0; i < ukupno; i++) {
      const datum = danaRanije(70 - i * 7);
      ocene.push({
        _id: oid(),
        productId: proizvod._id,
        userId: fizickaLica[i]._id,
        value: i < stavka.svidjanja ? 1 : -1,
        comment: i < KOMENTARI.length && i % 2 === 0 ? KOMENTARI[i] : "",
        createdAt: datum,
        updatedAt: datum,
      });
    }
  }

  await baza.collection("ratings").insertMany(ocene as never[]);

  // 9) Fakture --------------------------------------------------------------
  /*
   * Zasto seed uopste pravi fakture:
   *
   * Dva administratorska grafikona citaju iz kolekcije invoices - promet
   * stamparija u poslednjem kvartalu i najcesce narucivani proizvodi u mesec
   * dana. Bez unapred upisanih faktura oba bi na odbrani bila prazna, a tekst
   * zadatka izricito trazi bazu "popunjenu sa dovoljnom kolicinom podataka".
   *
   * Fakture su namerno razbacane kroz TRI MESECA, i deo njih je u poslednjih
   * mesec dana - tako se vidi da grafikoni stvarno filtriraju po periodu, a ne
   * da prikazuju sve.
   *
   * Lager se ovde NE dira: ove fakture predstavljaju vec zavrsen posao iz
   * proslosti, a stanje na lageru je ono koje je upisano uz proizvod.
   */
  const STATUSI_FAKTURA = ["RECEIVED", "RECEIVED", "DELIVERED", "PRINTING", "ORDERED"];
  const fakture: unknown[] = [];
  let brojacFaktura = 0;

  // (redni proizvod, klijent, koliko dana ranije, kolicina)
  const PLAN_FAKTURA: [number, number, number, number][] = [
    [0, 0, 84, 12], [1, 1, 80, 40], [4, 2, 76, 3], [7, 3, 71, 25],
    [5, 4, 66, 200], [2, 5, 61, 8], [10, 6, 55, 30], [12, 7, 50, 60],
    [3, 0, 44, 500], [8, 1, 39, 300], [0, 2, 33, 18], [13, 3, 28, 45],
    [1, 4, 24, 20], [6, 5, 19, 15], [11, 6, 15, 22], [0, 7, 11, 30],
    [1, 0, 8, 35], [14, 1, 6, 1000], [5, 2, 4, 120], [7, 3, 2, 10],
  ];

  for (const [redniProizvoda, redniKlijenta, dana, kolicina] of PLAN_FAKTURA) {
    const proizvod = proizvodi[redniProizvoda % proizvodi.length];
    const klijent = fizickaLica[redniKlijenta % fizickaLica.length];
    const kada = danaRanije(dana);

    const usluga = proizvod.printServices[0];
    const dodatna = usluga ? usluga.extraPricePerPiece : 0;
    const iznos = (proizvod.unitPrice + dodatna) * kolicina;

    brojacFaktura++;

    fakture.push({
      _id: oid(),
      number: `PH-${kada.getFullYear()}-${String(brojacFaktura).padStart(4, "0")}`,
      clientId: klijent._id,
      printerId: proizvod.printerId,
      items: [
        {
          _id: oid(),
          productId: proizvod._id,
          code: proizvod.code,
          name: proizvod.name,
          unitPrice: proizvod.unitPrice,
          quantity: kolicina,
          color: proizvod.availableColors[0] ?? "Bela",
          printType: usluga ? usluga.printType : "",
          extraPricePerPiece: dodatna,
          printText: "",
          printImage: "",
          printX: 50,
          printY: 50,
          printScale: 46,
          lineTotal: iznos,
        },
      ],
      total: iznos,
      status: STATUSI_FAKTURA[brojacFaktura % STATUSI_FAKTURA.length],
      createdAt: kada,
      updatedAt: kada,
    });
  }

  await baza.collection("invoices").insertMany(fakture as never[]);

  // Brojac mora da nastavi odakle su stale seed fakture - inace bi prva nova
  // faktura dobila broj koji vec postoji i pala na jedinstvenom indeksu.
  await baza.collection("counters").insertOne({ _id: "invoice", seq: brojacFaktura } as never);

  // 10) Izvestaj ------------------------------------------------------------
  const nalozi = [
    ["admin", "Admin123!", "administrator, prijava na /admin/prijava"],
    ...STAMPARIJE.map((s) => [s.username, s.password, "štamparija, " + s.institution.city]),
    ...FIZICKA_LICA.map((k) => [k.username, k.password, "klijent — fizičko lice"]),
    ...PRAVNA_LICA.map((k) => [k.username, k.password, "klijent — pravno lice"]),
  ];

  console.log("");
  console.log(`Upisano: ${kategorije.length} kategorije, ${proizvodi.length} proizvoda, ${ocene.length} ocena, ${fakture.length} faktura.`);
  console.log("");
  console.log("Nalozi za prijavu:");
  for (const [korisnik, lozinka, opis] of nalozi) {
    console.log("  " + korisnik.padEnd(16) + lozinka.padEnd(12) + opis);
  }
  console.log("");
  console.log("Čekaju odobrenje: " + NA_CEKANJU.map((k) => k.username).join(", "));

  await mongoose.disconnect();
}

main().catch((greska) => {
  console.error("Kreiranje baze nije uspelo:", greska);
  process.exit(1);
});
