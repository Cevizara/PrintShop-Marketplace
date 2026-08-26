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
