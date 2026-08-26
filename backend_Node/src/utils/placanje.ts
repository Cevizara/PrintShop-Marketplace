/**
 * Provera i obrada podataka o kartici.
 *
 * ========================== STA JE OVO, A STA NIJE ==========================
 *
 * Tekst zadatka trazi "besplatan servis za placanje (npr. Stripe Test Mode /
 * Sandbox PayPal Developer) gde klijent unosi podatke o tipu kartice, broju
 * kartice, CVC kodu i datumu isticanja (MM/GG)".
 *
 * Ovo je LOKALNA SIMULACIJA tog servisa, ne poziv ka Stripe-u. Razlozi:
 *
 *  - Stripe trazi nalog i tajni kljuc. Kljuc ne sme u repozitorijum, a bez
 *    njega aplikacija na tudjoj masini ne radi - a na odbrani se sve instalira
 *    i pokrece od nule.
 *  - Poziv ka Stripe-u trazi mrezu. Ako je nema, placanje se ne moze pokazati.
 *
 * Simulacija se ponasa kao Stripe Test Mode i koristi NJEGOVE zvanicne brojeve
 * test kartica, pa je ponasanje isto ono koje bi se videlo i sa pravim kljucem:
 *
 *   4242 4242 4242 4242   uspesno placanje
 *   4000 0000 0000 0002   banka odbija karticu
 *   4000 0000 0000 9995   nedovoljno sredstava
 *   4000 0000 0000 0069   kartica je istekla
 *
 * Sve ostale kartice prolaze ako zadovolje proveru broja. Prelazak na pravi
 * Stripe je zamena tela funkcije naplati() jednim pozivom ka njihovom API-ju -
 * ulaz i izlaz ostaju isti.
 *
 * ============================== STA SE NE CUVA ==============================
 *
 * Broj kartice i CVC se NIKADA ne upisuju u bazu. Cuva se samo ishod, tip
 * kartice i poslednje cetiri cifre - onoliko koliko treba da korisnik prepozna
 * kojom je karticom platio. To je jedino sto sme da ostane.
 */

export type IshodPlacanja =
  | { uspesno: true; brend: string; poslednje4: string; oznaka: string }
  | { uspesno: false; poruka: string };

/** Zvanicni brojevi test kartica iz Stripe dokumentacije. */
const TEST_KARTICE: Record<string, string> = {
  "4000000000000002": "Banka je odbila karticu.",
  "4000000000009995": "Nema dovoljno sredstava na računu.",
  "4000000000000069": "Kartica je istekla.",
  "4000000000000127": "CVC kod nije ispravan.",
};

/**
 * Luhn algoritam - provera kontrolne cifre broja kartice.
 *
 * Cifre se sabiraju s desna nalevo; svaka druga se udvostrucava, a ako tako
 * predje 9, oduzima joj se 9. Ispravan broj daje zbir deljiv sa 10.
 *
 * Ovo NIJE provera da kartica postoji - samo da broj nije nastao greskom u
 * kucanju. Bas to radi i svaki pravi platni sistem pre nego sto uopste posalje
 * zahtev banci.
 */
export function luhn(broj: string): boolean {
  const cifre = broj.replace(/\D/g, "");
  if (cifre.length < 12) return false;

  let zbir = 0;
  let udvostruci = false;

  for (let i = cifre.length - 1; i >= 0; i--) {
    let cifra = Number(cifre[i]);

    if (udvostruci) {
      cifra *= 2;
      if (cifra > 9) cifra -= 9;
    }

    zbir += cifra;
    udvostruci = !udvostruci;
  }

  return zbir % 10 === 0;
}

/**
 * Tip kartice iz prve cifre ili dve.
 * Klijent ga bira iz padajuce liste, ali server ga izvodi iz samog broja -
 * inace bi se Visa mogla prijaviti kao Amex.
 */
export function brendKartice(broj: string): string {
  const cifre = broj.replace(/\D/g, "");

  if (/^4/.test(cifre)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(cifre)) return "Mastercard";
  if (/^3[47]/.test(cifre)) return "American Express";
  if (/^(30[0-5]|36|38|39)/.test(cifre)) return "Diners Club";
  if (/^(6011|64[4-9]|65)/.test(cifre)) return "Discover";

  return "Kartica";
}

/** Je li datum isticanja MM/GG u buducnosti. */
function vaziDo(mesec: number, godina: number): boolean {
  if (mesec < 1 || mesec > 12) return false;

  const sada = new Date();
  const punaGodina = 2000 + godina;

  // Kartica vazi do KRAJA meseca koji pise na njoj.
  const istice = new Date(punaGodina, mesec, 1);
  return istice > sada;
}

export interface PodaciKartice {
  number: string;
  cvc: string;
  /** Oblik MM/GG, tacno kako trazi tekst zadatka. */
  expiry: string;
  holder?: string;
}

/**
 * "Naplata".
 *
 * Redosled provera je isti kao kod pravog platnog sistema: prvo oblik podataka
 * (to se odbija bez ikakvog poziva banci), pa tek onda ishod same transakcije.
 */
export function naplati(kartica: PodaciKartice): IshodPlacanja {
  const cifre = String(kartica.number ?? "").replace(/\D/g, "");
  const cvc = String(kartica.cvc ?? "").trim();
  const rok = String(kartica.expiry ?? "").trim();

  if (!cifre) {
    return { uspesno: false, poruka: "Unesite broj kartice." };
  }

  if (cifre.length < 12 || cifre.length > 19) {
    return { uspesno: false, poruka: "Broj kartice mora imati između 12 i 19 cifara." };
  }

  if (!luhn(cifre)) {
    return { uspesno: false, poruka: "Broj kartice nije ispravan. Proverite da niste pogrešili cifru." };
  }

  const brend = brendKartice(cifre);

  // American Express ima cetvorocifren CVC, ostali trocifren.
  const ocekivanaDuzinaCvc = brend === "American Express" ? 4 : 3;

  if (!/^\d+$/.test(cvc) || cvc.length !== ocekivanaDuzinaCvc) {
    return {
      uspesno: false,
      poruka: `CVC kod mora imati ${ocekivanaDuzinaCvc} cifre.`,
    };
  }

  const delovi = rok.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!delovi) {
    return { uspesno: false, poruka: "Datum isticanja se unosi u obliku MM/GG." };
  }

  if (!vaziDo(Number(delovi[1]), Number(delovi[2]))) {
    return { uspesno: false, poruka: "Kartica je istekla ili datum nije ispravan." };
  }

  // Tek sada "banka" odlucuje.
  const odbijena = TEST_KARTICE[cifre];
  if (odbijena) {
    return { uspesno: false, poruka: odbijena };
  }

  return {
    uspesno: true,
    brend,
    poslednje4: cifre.slice(-4),
    // Oznaka transakcije, u obliku u kojem je vracaju pravi platni sistemi.
    oznaka: "pi_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
  };
}
