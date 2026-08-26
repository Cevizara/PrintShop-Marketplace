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
import { napraviUzorkeSlika } from "./slike";
import {
  FIZICKA_LICA,
  KATEGORIJE,
  NA_CEKANJU,
  OCENE,
  PRAVNA_LICA,
  PROIZVODI,
  STAMPARIJE,
} from "./podaci";

const KOLEKCIJE = ["users", "categories", "products", "ratings", "password_resets"];

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
  const administrator = {
    _id: oid(),
    username: "admin",
    password: hes("Admin123!"),
    firstName: "Milan",
    lastName: "Petrović",
    phone: "064 123 4567",
    email: "admin@printinghouse.rs",
    profileImage: "default_profile_image.jpg",
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
    profileImage: "default_profile_image.jpg",
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
    profileImage: "default_profile_image.jpg",
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
    profileImage: "default_profile_image.jpg",
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
  const slike = napraviUzorkeSlika(PROIZVODI.map((p) => ({ code: p.code, name: p.name })));

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
        createdAt: datum,
        updatedAt: datum,
      });
    }
  }

  await baza.collection("ratings").insertMany(ocene as never[]);

  // 9) Izvestaj -------------------------------------------------------------
  const nalozi = [
    ["admin", "Admin123!", "administrator, prijava na /admin/prijava"],
    ...STAMPARIJE.map((s) => [s.username, s.password, "štamparija, " + s.institution.city]),
    ...FIZICKA_LICA.map((k) => [k.username, k.password, "klijent — fizičko lice"]),
    ...PRAVNA_LICA.map((k) => [k.username, k.password, "klijent — pravno lice"]),
  ];

  console.log("");
  console.log(`Upisano: ${kategorije.length} kategorije, ${proizvodi.length} proizvoda, ${ocene.length} ocena.`);
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
