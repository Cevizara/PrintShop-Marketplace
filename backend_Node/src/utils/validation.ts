/**
 * Serverske provere unosa.
 *
 * Iste provere postoje i na klijentu, ali samo radi poruke korisniku -
 * klijentska provera se zaobilazi u tri klika kroz alatke pregledaca ili
 * Postman-om. Ova strana je ta koja stvarno stiti bazu.
 */

/**
 * Lozinka: 8-12 karaktera, bar jedno veliko slovo, jedan broj i jedan
 * specijalni karakter, i MORA poceti slovom.
 *
 * Citanje izraza:
 *   (?=.*[A-Z])        negde postoji veliko slovo
 *   (?=.*\d)           negde postoji cifra
 *   (?=.*[^A-Za-z0-9]) negde postoji znak koji nije slovo ni cifra
 *   [A-Za-z]           prvi karakter je slovo
 *   .{7,11}            jos 7 do 11 karaktera  ->  ukupno 8 do 12
 *
 * Napomena: veliko slovo NE mora biti prvo. "aB3cdef!" je ispravna lozinka.
 */
export const LOZINKA = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/;

/** Maticni broj institucije: tacno 8 cifara. */
export const MATICNI_BROJ = /^[0-9]{8}$/;

/** PIB: 9 cifara, prva ne sme biti nula. */
export const PIB = /^[1-9][0-9]{8}$/;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Telefon: cifre, razmaci, plus, crta i kosa crta. */
export const TELEFON = /^[0-9+\/\s-]{6,20}$/;

/** Korisnicko ime: 3-30 karaktera, slova, cifre, tacka, donja crta i crta. */
export const KORISNICKO_IME = /^[A-Za-z0-9_.-]{3,30}$/;

export interface GreskaPolja {
  field: string;
  message: string;
}

/**
 * Skuplja greske PO POLJU, a ne kao jednu poruku.
 * Klijent tako moze da ispise gresku tacno ispod polja na koje se odnosi.
 *
 * Koristi se ulancano:
 *   const provera = new Provera()
 *     .obavezno("username", username, "Korisničko ime")
 *     .oblik("email", email, EMAIL, "I-mejl adresa nije ispravna.");
 *   if (!provera.ispravno) { ... provera.greske ... }
 */
export class Provera {
  private nadjene: GreskaPolja[] = [];

  /** Polje mora biti popunjeno. */
  obavezno(polje: string, vrednost: unknown, naziv: string): this {
    if (vrednost === undefined || vrednost === null || String(vrednost).trim() === "") {
      this.nadjene.push({ field: polje, message: `${naziv} je obavezno polje.` });
    }
    return this;
  }

  /**
   * Polje mora odgovarati izrazu - ali samo ako je popunjeno.
   * Prazno polje je posao metode obavezno(), da korisnik ne bi dobio dve
   * poruke o istom polju.
   */
  oblik(polje: string, vrednost: unknown, izraz: RegExp, poruka: string): this {
    const tekst = String(vrednost ?? "").trim();
    if (tekst !== "" && !izraz.test(tekst)) {
      this.nadjene.push({ field: polje, message: poruka });
    }
    return this;
  }

  /** Proizvoljan uslov koji mora biti tacan. */
  uslov(polje: string, tacno: boolean, poruka: string): this {
    if (!tacno) {
      this.nadjene.push({ field: polje, message: poruka });
    }
    return this;
  }

  get ispravno(): boolean {
    return this.nadjene.length === 0;
  }

  get greske(): GreskaPolja[] {
    return this.nadjene;
  }
}

/** Broj iz tela zahteva - klijentu se ne veruje ni za tip podatka. */
export function uBroj(vrednost: unknown, podrazumevano = 0): number {
  const broj = Number(vrednost);
  return Number.isFinite(broj) ? broj : podrazumevano;
}

/**
 * Priprema korisnicki unos za upotrebu unutar regularnog izraza.
 * Bez ovoga bi pretraga za "a.b" ili "c*" menjala znacenje upita, a unos
 * poput "(((" srusio bi upit.
 */
export function zaRegex(tekst: string): string {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
