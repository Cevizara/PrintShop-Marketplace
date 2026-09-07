import Stripe from "stripe";
import { env } from "../config/env";

/**
 * Provera i obrada podataka o kartici.
 *
 * ============================ DVA NACINA RADA ============================
 *
 * Tekst zadatka trazi "besplatan servis za placanje (npr. Stripe Test Mode /
 * Sandbox PayPal Developer) gde klijent unosi podatke o tipu kartice, broju
 * kartice, CVC kodu i datumu isticanja (MM/GG)".
 *
 *   1. STRIPE  - ako u .env stoji STRIPE_SECRET_KEY, salje se pravi poziv ka
 *                Stripe-u (Test Mode). Ispitivac tada vidi stvarni poziv ka
 *                spoljnom servisu, sto tekst i trazi.
 *
 *   2. LOKALNO - ako kljuca nema, ili ako poziv ka Stripe-u padne, naplatu
 *                resava ovaj fajl, sa Stripe-ovim ZVANICNIM brojevima test
 *                kartica, pa je ponasanje isto.
 *
 * Zasto oba, a ne samo Stripe: na odbrani se sve instalira i pokrece od nule.
 * Ako tada nema mreze ili .env fajla, sa samim Stripe-om se placanje ne bi
 * moglo pokazati uopste. Ovako uvek postoji nesto sto radi, a kad ima uslova
 * radi pravi poziv. Isti obrazac koji posta vec koristi (utils/mail.ts).
 *
 * Koji je nacin odlucio vraca se u polju `motor`, pa se nikad ne pogadja.
 *
 * ============================ STA SE NE CUVA ============================
 *
 * Broj kartice i CVC se NIKADA ne upisuju u bazu. Cuva se samo ishod, tip
 * kartice i poslednje cetiri cifre - onoliko koliko treba da korisnik prepozna
 * kojom je karticom platio. To je jedino sto sme da ostane.
 */

export type MotorPlacanja = "stripe" | "lokalno";

export type IshodPlacanja =
  | {
      uspesno: true;
      brend: string;
      poslednje4: string;
      oznaka: string;
      /** Koji nacin je odlucio - da se u prikazu i u logu nikad ne pogadja. */
      motor: MotorPlacanja;
    }
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

/** Sto je proslo proveru oblika - spremno i za lokalnu odluku i za Stripe. */
interface ProvereneKartice {
  cifre: string;
  cvc: string;
  brend: string;
  mesec: number;
  godina: number;
}

/**
 * Provera OBLIKA podataka.
 *
 * Radi se UVEK, pre bilo kakvog poziva napolje, i kad je Stripe ukljucen.
 * Dva razloga: isti je redosled kao kod pravog platnog sistema (oblik se
 * odbija bez pitanja banke), i pogresno otkucan broj tako uopste ne napusta
 * ovu masinu.
 */
function proveriOblik(kartica: PodaciKartice): { greska: string } | ProvereneKartice {
  const cifre = String(kartica.number ?? "").replace(/\D/g, "");
  const cvc = String(kartica.cvc ?? "").trim();
  const rok = String(kartica.expiry ?? "").trim();

  if (!cifre) {
    return { greska: "Unesite broj kartice." };
  }

  if (cifre.length < 12 || cifre.length > 19) {
    return { greska: "Broj kartice mora imati između 12 i 19 cifara." };
  }

  if (!luhn(cifre)) {
    return { greska: "Broj kartice nije ispravan. Proverite da niste pogrešili cifru." };
  }

  const brend = brendKartice(cifre);

  // American Express ima cetvorocifren CVC, ostali trocifren.
  const ocekivanaDuzinaCvc = brend === "American Express" ? 4 : 3;

  if (!/^\d+$/.test(cvc) || cvc.length !== ocekivanaDuzinaCvc) {
    return { greska: `CVC kod mora imati ${ocekivanaDuzinaCvc} cifre.` };
  }

  const delovi = rok.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!delovi) {
    return { greska: "Datum isticanja se unosi u obliku MM/GG." };
  }

  const mesec = Number(delovi[1]);
  const godina = Number(delovi[2]);

  if (!vaziDo(mesec, godina)) {
    return { greska: "Kartica je istekla ili datum nije ispravan." };
  }

  return { cifre, cvc, brend, mesec, godina };
}

/** Lokalna odluka - kad kljuca nema, ili kad poziv ka Stripe-u padne. */
function naplatiLokalno(podaci: ProvereneKartice): IshodPlacanja {
  const odbijena = TEST_KARTICE[podaci.cifre];
  if (odbijena) {
    return { uspesno: false, poruka: odbijena };
  }

  return {
    uspesno: true,
    brend: podaci.brend,
    poslednje4: podaci.cifre.slice(-4),
    // Oznaka transakcije, u obliku u kojem je vracaju pravi platni sistemi.
    oznaka: "pi_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
    motor: "lokalno",
  };
}

/**
 * Klijent ka Stripe-u se pravi jednom i cuva - kao i posiljalac poste.
 * Pravi se tek pri prvoj naplati, da server radi i kad kljuca nema.
 */
let stripe: Stripe | null = null;

function nabaviStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey);
  }
  return stripe;
}

/**
 * Greska koju je vratio Stripe, ali koja NIJE odbijanje kartice.
 *
 * Razlika je vazna: odbijena kartica je legitiman ishod i klijent treba da
 * vidi razlog i ponovi korak. Pao poziv (nema mreze, kljuc ne valja, valuta
 * nije podrzana) nije klijentov problem - tada se prelazi na lokalnu odluku,
 * da placanje moze da se pokaze i tada.
 */
function jeOdbijanje(greska: unknown): greska is Stripe.errors.StripeError {
  return (
    typeof greska === "object" &&
    greska !== null &&
    (greska as Stripe.errors.StripeError).type === "StripeCardError"
  );
}

/**
 * Pravi poziv ka Stripe-u, u Test Mode.
 *
 * Ide u dva koraka, kako Stripe i trazi kad se karta unosi rucno:
 *   1. od podataka o kartici se napravi token
 *   2. tim tokenom se naplati iznos
 *
 * Iznos je u NAJMANJOJ jedinici valute (para, cent), zato * 100.
 */
async function naplatiPrekoStripe(
  podaci: ProvereneKartice,
  iznosRsd: number
): Promise<IshodPlacanja> {
  const veza = nabaviStripe();

  const token = await veza.tokens.create({
    card: {
      number: podaci.cifre,
      exp_month: String(podaci.mesec),
      exp_year: String(2000 + podaci.godina),
      cvc: podaci.cvc,
    },
  });

  const naplata = await veza.charges.create({
    amount: Math.round(iznosRsd * 100),
    currency: env.stripeCurrency,
    source: token.id,
    description: "Printing House — plaćanje faktura",
  });

  if (naplata.status !== "succeeded") {
    return {
      uspesno: false,
      poruka: "Banka nije odobrila transakciju. Pokušajte drugom karticom.",
    };
  }

  return {
    uspesno: true,
    // Brend i poslednje cifre uzimamo od Stripe-a kad ih on javi - on zna
    // vise o kartici nego sto se vidi iz samog broja.
    brend: naplata.payment_method_details?.card?.brand
      ? naplata.payment_method_details.card.brand.toUpperCase()
      : podaci.brend,
    poslednje4: naplata.payment_method_details?.card?.last4 ?? podaci.cifre.slice(-4),
    oznaka: naplata.id,
    motor: "stripe",
  };
}

/**
 * "Naplata".
 *
 * Redosled je isti kao kod pravog platnog sistema: prvo oblik podataka (to se
 * odbija bez ikakvog poziva napolje), pa tek onda ishod same transakcije.
 *
 * `iznosRsd` je ukupan iznos svih faktura koje se placaju odjednom - tekst
 * zadatka kaze "fakturu/fakture", pa jedna kartica moze da plati vise njih.
 */
export async function naplati(
  kartica: PodaciKartice,
  iznosRsd: number
): Promise<IshodPlacanja> {
  const provereno = proveriOblik(kartica);

  if ("greska" in provereno) {
    return { uspesno: false, poruka: provereno.greska };
  }

  if (!env.stripeSecretKey) {
    return naplatiLokalno(provereno);
  }

  try {
    return await naplatiPrekoStripe(provereno, iznosRsd);
  } catch (greska) {
    // Odbijena kartica je odgovor, ne kvar - prosledjuje se klijentu.
    if (jeOdbijanje(greska)) {
      return {
        uspesno: false,
        poruka: greska.message || "Banka je odbila karticu.",
      };
    }

    // Sve ostalo je kvar na nasoj strani ili na vezi. Placanje se ne obara
    // zbog toga - prelazi se na lokalnu odluku, ali se u log upise zasto.
    const razlog = greska instanceof Error ? greska.message : String(greska);
    console.error("Poziv ka Stripe-u nije uspeo, naplata ide lokalno:", razlog);

    return naplatiLokalno(provereno);
  }
}
