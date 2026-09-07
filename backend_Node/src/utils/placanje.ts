import Stripe from "stripe";
import { env } from "../config/env";

/**
 * Bez Stripe ključeva radi lokalna demonstracija. Sa oba TEST ključa, karticu
 * prikuplja Stripe Elements, a server vidi samo potvrđeni PaymentIntent.
 * Neuspešan Stripe poziv nikad ne prelazi u lokalni uspeh.
 */
export type MotorPlacanja = "stripe" | "lokalno";
export type IshodPlacanja =
  | { uspesno: true; brend: string; poslednje4: string; oznaka: string; motor: MotorPlacanja }
  | { uspesno: false; poruka: string };

export interface PodaciKartice {
  number: string;
  cvc: string;
  expiry: string;
}

const TEST_KARTICE: Record<string, string> = {
  "4000000000000002": "Banka je odbila karticu.",
  "4000000000009995": "Nema dovoljno sredstava na računu.",
  "4000000000000069": "Kartica je istekla.",
  "4000000000000127": "CVC kod nije ispravan.",
};

export function stripeJePodesen(): boolean {
  return Boolean(env.stripeSecretKey && env.stripePublishableKey);
}

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

export function brendKartice(broj: string): string {
  const cifre = broj.replace(/\D/g, "");
  if (/^4/.test(cifre)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(cifre)) return "Mastercard";
  if (/^3[47]/.test(cifre)) return "American Express";
  if (/^(30[0-5]|36|38|39)/.test(cifre)) return "Diners Club";
  if (/^(6011|64[4-9]|65)/.test(cifre)) return "Discover";
  return "Kartica";
}

function vaziDo(mesec: number, godina: number): boolean {
  return mesec >= 1 && mesec <= 12 && new Date(2000 + godina, mesec, 1) > new Date();
}

/** Lokalni režim se koristi samo kada Stripe nije konfigurisan. */
export function naplatiLokalno(kartica: PodaciKartice): IshodPlacanja {
  const cifre = String(kartica.number ?? "").replace(/\D/g, "");
  const cvc = String(kartica.cvc ?? "").trim();
  const rok = String(kartica.expiry ?? "").trim();
  if (!cifre || cifre.length < 12 || cifre.length > 19 || !luhn(cifre)) {
    return { uspesno: false, poruka: "Broj kartice nije ispravan." };
  }
  const brend = brendKartice(cifre);
  const potrebniCvc = brend === "American Express" ? 4 : 3;
  if (!/^\d+$/.test(cvc) || cvc.length !== potrebniCvc) {
    return { uspesno: false, poruka: `CVC kod mora imati ${potrebniCvc} cifre.` };
  }
  const datum = rok.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!datum || !vaziDo(Number(datum[1]), Number(datum[2]))) {
    return { uspesno: false, poruka: "Datum isticanja nije ispravan." };
  }
  const odbijena = TEST_KARTICE[cifre];
  if (odbijena) return { uspesno: false, poruka: odbijena };
  return {
    uspesno: true,
    brend,
    poslednje4: cifre.slice(-4),
    oznaka: "lok_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
    motor: "lokalno",
  };
}

let stripe: Stripe | null = null;
function nabaviStripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error("Stripe secret key nije podešen.");
  if (!stripe) stripe = new Stripe(env.stripeSecretKey);
  return stripe;
}

export async function napraviPaymentIntent(
  invoiceIds: string[], clientId: string, iznosRsd: number
): Promise<{ clientSecret: string; publishableKey: string; currency: string }> {
  if (!stripeJePodesen()) throw new Error("Stripe Test Mode nije podešen.");
  const intent = await nabaviStripe().paymentIntents.create({
    amount: Math.round(iznosRsd * 100), currency: env.stripeCurrency,
    payment_method_types: ["card"],
    metadata: { clientId, invoiceIds: [...invoiceIds].sort().join(",") },
    description: "Printing House - plaćanje faktura",
  });
  if (!intent.client_secret) throw new Error("Stripe nije vratio client secret.");
  return { clientSecret: intent.client_secret, publishableKey: env.stripePublishableKey, currency: env.stripeCurrency };
}

export async function potvrdiPaymentIntent(
  paymentIntentId: string, invoiceIds: string[], clientId: string, iznosRsd: number
): Promise<IshodPlacanja> {
  if (!stripeJePodesen()) return { uspesno: false, poruka: "Stripe Test Mode nije podešen." };
  const intent = await nabaviStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
  if (
    intent.status !== "succeeded" || intent.amount !== Math.round(iznosRsd * 100) ||
    intent.currency !== env.stripeCurrency || intent.metadata.clientId !== clientId ||
    intent.metadata.invoiceIds !== [...invoiceIds].sort().join(",")
  ) return { uspesno: false, poruka: "Stripe transakcija ne odgovara izabranim fakturama." };
  const metoda = typeof intent.payment_method === "string" ? undefined : intent.payment_method;
  return {
    uspesno: true, brend: metoda?.card?.brand?.toUpperCase() ?? "KARTICA",
    poslednje4: metoda?.card?.last4 ?? "", oznaka: intent.id, motor: "stripe",
  };
}
