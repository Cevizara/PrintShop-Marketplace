# Printing House

Projekat iz predmeta **Programiranje internet aplikacija**, školska 2025/26.

Veb sistem koji povezuje štamparije i naručioce štampe. Tri vrste korisnika:
klijenti (fizička i pravna lica), štampari i administrator sistema.

**Angular 20** (klijentski deo) + **Express 5 / Node** (serverski deo) + **MongoDB**.

---

## Pokretanje

Potreban je pokrenut MongoDB na `mongodb://127.0.0.1:27017`.
Na Windows-u, iz komandne linije **sa administratorskim pravima**:

```
net start MongoDB
```

### 1. Baza podataka

Baza se kreira i popunjava **nezavisno od aplikacije**, kako traži tekst zadatka.
Aplikacija ima isključen `autoCreate` i `autoIndex` i samo se povezuje na već
postojeću bazu — kolekcije i indekse pravi isključivo ovaj skript:

```
cd backend_Node
npm install
npm run seed
```

Skript briše postojeće kolekcije, pravi ih iznova zajedno sa indeksima, i
popunjava ih podacima dovoljnim da se vide sve funkcionalnosti. Uz to pravi i
uzorke slika proizvoda u folderu `uploads/`.

### 2. Server

```
cd backend_Node
npm start
```

Sluša na portu **4000**.

### 3. Klijentska aplikacija

```
cd frontend
npm install
npm start
```

Dostupna na **http://localhost:4200**.

---

## Nalozi za prijavu

| Korisničko ime | Lozinka | Uloga |
|---|---|---|
| `admin` | `Admin123!` | administrator — prijava na `/admin/prijava` |
| `copystudio` | `Stampar1!` | štamparija, Beograd |
| `printnovi` | `Stampar2!` | štamparija, Novi Sad |
| `nisprint` | `Stampar3!` | štamparija, Niš |
| `pera` … `vuk` | `Klijent1!` … `Klijent8!` | klijenti — fizička lica |
| `etf` | `Pravno11!` | klijent — pravno lice |

Posle proširenog seed-a postoje i dodatni nalozi za demonstraciju većeg sistema:

| Korisničko ime | Lozinka | Uloga |
|---|---|---|
| `artprint` … `vrsacmedia` | `Stampar4!` … `Stampar9!` | još šest štamparija, u šest različitih gradova |
| `maja` … `dunja` | `Klijent9!` … `Klijent20!` | još dvanaest klijenata — fizičkih lica |
| `startit` | `Pravno22!` | klijent — pravno lice; ima otvorenu korpu za javnu nabavku |
| `kulturacentar` | `Pravno33!` | klijent — pravno lice; ima neuspelu javnu nabavku |

Nalozi `novastamparija`, `jelena`, `brzaprinta`, `marija`, `dalibor` i
`skolaplus` namerno čekaju odobrenje administratora, i namerno nemaju svoju
profilnu sliku — tako se vidi i podrazumevana `default_profile_image.jpg`.
Ostali nalozi imaju generisan avatar.

Za probu uvoza lager liste iz JSON fajla poslužiće `primer-proizvodi.json` iz
korena projekta (Prilog 1 teksta zadatka). Prijavite se kao `printnovi` — taj
nalog nema šifre `PR-001` do `PR-003`, pa uvoz prolazi u celini.

Prijava administratora je na **posebnoj ruti** `/admin/prijava` i nigde nije
povezana linkom sa javnog dela sajta — tako traži tekst zadatka.

### Javne nabavke — šta se vidi odmah

Nalog `etf` ima jednu **već zaključenu** nabavku `JN-2026-0001`, sa tri ponude i
PDF izveštajem — da se licitacije vide bez čekanja da rok od deset minuta
istekne.

**Pobedila je druga po ceni, i to je ispravno.** Tekst zadatka traži najnižu
ponudu **i** dovoljnu količinu svakog proizvoda na stanju:

| Štamparija | Ponuda | |
|---|---|---|
| Niš Print Centar | 95.500 | najniža, ali nema dovoljno majica ni šolja |
| **Copy Studio Kumanovska** | **104.000** | **dobila nabavku** |
| Print Novi Sad | 107.500 | pokriva sve, ali skuplja |

Da se vidi **otvorena** licitacija i slanje ponude, treba je raspisati uživo:
kao `etf` ubaciti proizvode u korpu i pritisnuti POTVRDI, pa se prijaviti kao
štamparije i poslati ponude.

---

## Šta je do sada urađeno

| Deo | Stanje |
|---|---|
| Prijava svih tipova korisnika | gotovo |
| Registracija (fizičko lice, pravno lice, štamparija) | gotovo |
| Zaboravljena lozinka (link važi 5 minuta) | gotovo |
| Javna početna: broj štamparija, TOP 5, pretraga | gotovo |
| Detalji proizvoda sa galerijom | gotovo |
| Profil — prikaz i ažuriranje, za sve uloge | gotovo |
| Klijent: pretraga i prošireni detalji proizvoda | gotovo |
| Štampar: proizvodi i usluge, količine, uvoz iz JSON fajla | gotovo |
| Administrator: zahtevi, nalozi, kategorije | gotovo |
| Mapa štamparije u proširenim detaljima | gotovo |
| Administrator: grafikon kretanja ocene kroz vreme | gotovo |
| Priprema proizvoda, e-korpa, zatvaranje narudžbine | gotovo |
| Tabela narudžbina (na profilu), otkazivanje, promena statusa | gotovo |
| Javne nabavke i licitacije | gotovo |
| Ocene, komentari, arhiva proizvoda | gotovo |
| PDF faktura na i-mejl, PDF izveštaj o licitacijama | gotovo |
| Sva tri administratorska grafikona | gotovo |
| Servis za plaćanje karticom | gotovo |

Prijavljeni korisnik se otvara na strani koja je posao njegove uloge: klijent na
pretrazi, štampar na lager listi, administrator na zahtevima.

---

## Struktura

```
backend_Node/src/
  config/       podešavanja i povezivanje na bazu
  models/       Mongoose šeme
  controllers/  poslovna logika
  routers/      rute i provera prava pristupa
  middleware/   JWT autorizacija, otpremanje slika
  utils/        validacija i mapiranje
  seed/         skript za kreiranje baze

frontend/src/app/
  models/       tipovi koje server vraća
  services/     HTTP pozivi, prijava, JWT interceptor, guard, kolačići
  <strana>/     po jedna komponenta po strani (.ts + .html + .css)
```

---

## Podešavanja

Kopirati `backend_Node/.env.example` u `backend_Node/.env` i prilagoditi.
Bez tog fajla aplikacija radi sa podrazumevanim vrednostima.

`.env` se **ne čuva u repozitorijumu** — sadrži tajni ključ za potpisivanje
JWT tokena.

### Pošta

Fakture se šalju klijentu kao PDF prilog. Bez ikakvog podešavanja koristi se
**Ethereal** — nalog za probu koji se pravi sam, bez registracije. Poruka se ne
isporučuje nikome nego ostaje na njihovom sajtu, a adresa na kojoj se vidi
pojavi se u korpi odmah posle potvrde narudžbine.

Za pravu poštu, popuniti u `.env`:

```
SMTP_HOST=smtp.primer.rs
SMTP_PORT=587
SMTP_USER=nalog
SMTP_PASS=lozinka
MAIL_FROM=Printing House <faktura@primer.rs>
```

Slanje **nikada ne obara narudžbinu**: ako padne, faktura je već izdata i PDF se
i dalje preuzima sa strane „Narudžbine". Ethereal traži internet; preuzimanje ne.

### Plaćanje karticom

Radi na dva načina, i sam bira koji:

- **bez podešavanja** — naplatu rešava server, sa Stripe-ovim zvaničnim
  brojevima test kartica. Radi i bez interneta.
- **sa test ključem u `.env`** — ide pravi poziv ka Stripe-u (Test Mode).

Za pravi poziv, uzeti besplatan **test** ključ sa
`dashboard.stripe.com/test/apikeys` i upisati:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_CURRENCY=rsd
```

Ako Stripe odbije valutu — nalog otvoren van Srbije često ne može da naplati u
dinarima — staviti `STRIPE_CURRENCY=eur`.

Odgovor servera posle plaćanja nosi polje **`engine`**: `"stripe"` ako je poziv
zaista otišao, `"lokalno"` ako je odlučio server. Tako se ne pogađa.

Kada su oba test ključa prisutna, Stripe Elements prikuplja broj kartice, datum
i CVC direktno za Stripe — ne prolaze kroz Angular ni backend. Backend zatim
ponovo proverava PaymentIntent (iznos, valuta, vlasnik i fakture) pre promene
statusa. Ako Stripe poziv padne, naplata ostaje neuspešna; nema prikrivenog
prelaska u lokalni uspeh. Lokalni režim postoji samo kada oba Stripe ključa
nisu podešena.

Brojevi test kartica: `4242 4242 4242 4242` prolazi, `4000 0000 0000 0002`
banka odbija, `4000 0000 0000 9995` nema sredstava, `4000 0000 0000 0069`
istekla. Broj kartice i CVC se **nikada** ne upisuju u bazu.

### PDF i naša slova

Ugrađeni PDF fontovi nemaju č, ć, š, ž i đ — ta slova su u Latin-2, a fontovi
koriste Latin-1. Zato se učitava sistemski TTF: **Arial**, pa Calibri, pa Segoe
UI, pa DejaVu. Prva tri postoje na svakom Windows-u.

Ako se nijedan ne nađe, dokument i dalje nastaje — samo bez dijakritike — i
server to javi u konzoli pri prvom pravljenju PDF-a.
