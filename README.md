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

Nalozi `novastamparija` i `jelena` namerno čekaju odobrenje administratora.

Prijava administratora je na **posebnoj ruti** `/admin/prijava` i nigde nije
povezana linkom sa javnog dela sajta — tako traži tekst zadatka.

---

## Šta je do sada urađeno

| Deo | Stanje |
|---|---|
| Prijava svih tipova korisnika | gotovo |
| Registracija (fizičko lice, pravno lice, štamparija) | gotovo |
| Zaboravljena lozinka (link važi 5 minuta) | gotovo |
| Obrada zahteva za registraciju (administrator) | gotovo |
| Javna početna: broj štamparija, TOP 5, pretraga | gotovo |
| Detalji proizvoda sa galerijom | gotovo |
| Ostatak klijentskog i štamparskog dela | predstoji |

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
