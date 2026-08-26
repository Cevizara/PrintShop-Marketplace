// Oblici podataka koje vraca server. Imena polja su na engleskom, isto kao u bazi.

export type TipKorisnika = 'CLIENT_INDIVIDUAL' | 'CLIENT_COMPANY' | 'PRINTER' | 'ADMIN';
export type StatusKorisnika = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Institucija {
  name: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  registrationNumber: string;
  taxId: string;
}

export interface Korisnik {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  profileImage: string;
  type: TipKorisnika;
  status: StatusKorisnika;
  institution?: Institucija;
  createdAt?: string;
}

export interface OdgovorPrijave {
  token: string;
  user: Korisnik;
}

/** Server vraca greske vezane za konkretno polje forme. */
export interface GreskaPolja {
  field: string;
  message: string;
}

export interface TopProizvod {
  _id: string;
  name: string;
  categoryName: string;
  mainImage: string;
  likes: number;
  dislikes: number;
  printerName: string;
  printerCity: string;
}

export interface PodaciPocetne {
  printerCount: number;
  topProducts: TopProizvod[];
}

export interface RezultatPretrage {
  _id: string;
  name: string;
  categoryName: string;
  subcategoryName: string;
  mainImage: string;
  printerName: string;
  printerCity: string;
}

/** Detalji koje vidi neregistrovani korisnik - bez cene, opisa i usluga. */
export interface JavniDetalji {
  _id: string;
  name: string;
  categoryName: string;
  subcategoryName: string;
  mainImage: string;
  additionalImages: string[];
  printerName: string;
  printerCity: string;
  likes: number;
  dislikes: number;
}

export interface OdgovorResetLinka {
  message: string;
  link: string;
  expiresAt: string;
  username: string;
}

// --- kategorije -------------------------------------------------------------

export interface Potkategorija {
  _id: string;
  name: string;
}

export interface Kategorija {
  _id: string;
  name: string;
  subcategories: Potkategorija[];
  /** Broj proizvoda u kategoriji - stiže samo na administratorskoj ruti. */
  productCount?: number;
}

// --- proizvodi --------------------------------------------------------------

/** Specijalizovan tip štampe koji povećava cenu po komadu. */
export interface UslugaStampe {
  _id?: string;
  code: string;
  printType: string;
  extraPricePerPiece: number;
  maxWidthMm: number;
  maxHeightMm: number;
}

/**
 * Proizvod sa SVIM podacima. Ovo vidi prijavljen klijent i štampar nad svojim
 * proizvodima. Neregistrovani posetilac dobija skraćeni oblik - JavniDetalji.
 */
export interface Proizvod {
  _id: string;
  code: string;
  name: string;
  description: string;
  categoryName: string;
  subcategoryName: string;
  unitPrice: number;
  stock: number;
  availableColors: string[];
  mainImage: string;
  additionalImages: string[];
  printServices: UslugaStampe[];
  printerId: string;
  printerName: string;
  printerCity: string;
  printerAddress: string;
  printerLat?: number;
  printerLng?: number;
  likes?: number;
  dislikes?: number;
}

// --- korpa i fakture --------------------------------------------------------

/**
 * Jedna stavka e-korpe, već spremljena na serveru.
 * Cene stižu izračunate iz PROIZVODA, ne iz korpe — ako štampar promeni cenu,
 * u korpi se vidi nova. Vidi model Cart na serveru.
 */
export interface StavkaKorpe {
  _id: string;
  productId: string;
  code: string;
  name: string;
  mainImage: string;
  printerId: string;
  printerName: string;
  printerCity: string;
  quantity: number;
  color: string;
  unitPrice: number;
  printServiceId?: string;
  printType: string;
  extraPricePerPiece: number;
  printText: string;
  printImage: string;
  /** Središte i širina otiska, u procentima slike proizvoda. */
  printX: number;
  printY: number;
  printScale: number;
  lineTotal: number;
  stock: number;
  /** Ima li još uvek dovoljno na stanju za ovu količinu. */
  available: boolean;
}

/** Stavke jedne štamparije — od svake grupe nastaje po jedna faktura. */
export interface GrupaKorpe {
  printerId: string;
  printerName: string;
  printerCity: string;
  items: StavkaKorpe[];
  total: number;
}

export interface Korpa {
  groups: GrupaKorpe[];
  itemCount: number;
  total: number;
  /** Broj faktura koje bi nastale — jedna po štampariji. */
  invoiceCount: number;
}

export type StatusNarudzbine =
  | 'ORDERED'
  | 'PAID'
  | 'PRINTING'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED';

/** Nazivi statusa koje vidi korisnik. Kod je engleski, prikaz srpski. */
export const NAZIV_STATUSA: Record<StatusNarudzbine, string> = {
  ORDERED: 'naručeno',
  PAID: 'plaćeno',
  PRINTING: 'u štampi',
  DELIVERED: 'isporučeno',
  RECEIVED: 'primljeno',
  CANCELLED: 'otkazano',
};

/** Jedna stavka fakture — sve je prepisano pri izdavanju, vidi model Invoice. */
export interface StavkaFakture {
  _id: string;
  productId: string;
  code: string;
  name: string;
  unitPrice: number;
  quantity: number;
  color: string;
  printType: string;
  extraPricePerPiece: number;
  printText: string;
  printImage: string;
  printX: number;
  printY: number;
  printScale: number;
  lineTotal: number;
}

/**
 * Faktura, odnosno narudžbina — to je jedna te ista stvar.
 * Naziv štamparije i grad stižu spajanjem na serveru, jer se čuvaju na
 * korisniku a ne na fakturi.
 */
export interface Narudzbina {
  _id: string;
  number: string;
  clientId: string;
  printerId: string;
  items: StavkaFakture[];
  total: number;
  status: StatusNarudzbine;
  procurementId?: string;
  createdAt: string;
  updatedAt: string;

  /** Stiže na klijentskoj tabeli. */
  printerName?: string;
  printerCity?: string;

  /** Stiže na štamparskoj tabeli. */
  clientName?: string;
  clientUsername?: string;
  clientInstitution?: string;
}

/** Kratak opis izdate fakture, onako kako stiže posle zatvaranja narudžbine. */
export interface IzdataFaktura {
  _id: string;
  number: string;
  printerName: string;
  printerCity: string;
  total: number;
  itemCount: number;

  /** Je li PDF faktura stigla na i-mejl. Slanje ne obara narudžbinu ako padne. */
  mailSent: boolean;
  /** Adresa na kojoj se poslata poruka može pogledati (nalog za probu). */
  mailPreviewUrl?: string;
}

// --- ocene, komentari, arhiva -----------------------------------------------

/** Jedan komentar uz proizvod: korisničko ime, datum i tekst — kako traži tekst. */
export interface Komentar {
  _id: string;
  userId: string;
  username: string;
  value: 1 | -1;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface MojaOcena {
  value: 1 | -1;
  comment: string;
  updatedAt: string;
}

export interface OdgovorKomentara {
  comments: Komentar[];
  likes: number;
  dislikes: number;
  /** Ocena prijavljenog klijenta, ako ju je već ostavio. */
  myRating: MojaOcena | null;
  /** Sme li da oceni — samo ako je proizvod primio. */
  canRate: boolean;
}

/**
 * Jedna stavka arhive: POJEDINAČAN proizvod sa fakture koja je isporučena ili
 * primljena. Status stoji na fakturi, pa svaka stavka nosi status svoje fakture.
 */
export interface StavkaArhive {
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: StatusNarudzbine;
  invoiceDate: string;
  printerName: string;
  printerCity: string;
  itemId: string;
  productId: string;
  code: string;
  name: string;
  quantity: number;
  color: string;
  printType: string;
  printText: string;
  printImage: string;
  lineTotal: number;
  canRate: boolean;
  myRating: MojaOcena | null;
}

// --- javne nabavke i licitacije ---------------------------------------------

export type StatusNabavke = 'OPEN' | 'AWARDED' | 'FAILED';

/** Jedna tražena stavka: OPIS onoga što se traži, ne pokazivač na tuđi proizvod. */
export interface StavkaNabavke {
  _id: string;
  name: string;
  categoryName: string;
  subcategoryName: string;
  quantity: number;
}

export interface Nabavka {
  _id: string;
  number: string;
  clientId: string | { username: string; institution?: { name: string; city: string } };
  items: StavkaNabavke[];
  createdAt: string;
  deadline: string;
  status: StatusNabavke;
  settledAt?: string;
  winnerPrinterId?: { _id: string; institution?: { name: string; city: string } };
  winnerBidId?: string;
  winnerTotal?: number;
  invoiceId?: string;
  failureReason?: string;

  /** Računa server pri svakom čitanju. */
  secondsLeft?: number;
  bidCount?: number;
  myBid?: Ponuda | null;
}

/** Jedan red ponude: čime štampar pokriva traženu stavku i po kojoj ceni. */
export interface RedPonude {
  _id: string;
  itemId: string;
  productId: string;
  productName: string;
  productCode: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Ponuda {
  _id: string;
  procurementId: string;
  printerId: string | { _id: string; institution?: { name: string; city: string } };
  lines: RedPonude[];
  total: number;
  createdAt: string;
}

export interface IzvestajNabavke {
  procurement: Nabavka;
  bids: Ponuda[];
}

/** Jedna stavka štamparskog izveštaja o licitacijama. */
export interface MojaPonuda {
  bid: Ponuda;
  procurement: Nabavka;
  won: boolean;
}

// --- statistike -------------------------------------------------------------

/** Jedna ocena kao događaj u vremenu: kada je data i da li je lajk ili dislajk. */
export interface TackaOcene {
  date: string;
  value: 1 | -1;
}

/**
 * Kretanje ocene jednog proizvoda kroz vreme.
 * Server šalje sirove događaje; zbir se računa na klijentu, da bi isključivanje
 * proizvoda iz prikaza radilo bez novog poziva ka serveru.
 */
export interface KretanjeOcene {
  productId: string;
  name: string;
  categoryName: string;
  points: TackaOcene[];
}

/** Promet jedne štamparije u poslednjem kvartalu — stubičasti grafikon. */
export interface PrometStamparije {
  printerId: string;
  name: string;
  city: string;
  total: number;
  invoiceCount: number;
}

/** Jedan proizvod na pita grafikonu najčešće naručivanih. */
export interface NarucivanProizvod {
  name: string;
  quantity: number;
  revenue: number;
  /** Udeo u ukupnoj količini, u procentima. Računa server. */
  share: number;
}

/** Izveštaj o uvozu lager liste iz JSON fajla. */
export interface IzvestajUvoza {
  message: string;
  imported: number;
  skipped: { code: string; reason: string }[];
  products: Proizvod[];
}
