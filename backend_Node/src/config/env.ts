import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

/**
 * Sva podesavanja na jednom mestu.
 * Vrednosti se mogu promeniti kroz .env fajl, ali aplikacija radi i bez njega.
 */
export const env = {
  port: Number(process.env.PORT || 4000),

  // Nova baza. Stara "printing_house" se namerno ne dira - sluzi kao referenca.
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/printing_house_v2",

  // Tajni kljuc kojim server potpisuje JWT tokene.
  jwtSecret: process.env.JWT_SECRET || "pia-printing-house-razvojni-kljuc",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",

  clientUrl: process.env.CLIENT_URL || "http://localhost:4200",

  // Tekst zadatka: link za ponistavanje lozinke vazi 5 minuta.
  passwordResetMinutes: 5,

  /**
   * Posta. Ako se ostave prazni, koristi se Ethereal - nalog za probu koji se
   * pravi sam, bez registracije, i cija se poruka gleda na vebu. Vidi utils/mail.ts.
   */
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "Printing House <faktura@printinghouse.rs>",

  /**
   * Placanje. Ako se kljuc ostavi prazan, naplata se resava lokalno, sa
   * Stripe-ovim brojevima test kartica. Ako se upise TEST kljuc (sk_test_...),
   * ide pravi poziv ka Stripe-u. Vidi utils/placanje.ts.
   *
   * Valuta je podesiva jer zavisi od zemlje Stripe naloga: nalog otvoren van
   * Srbije cesto ne moze da naplati u RSD, pa se prelazi na "usd" ili drugu
   * valutu koju Stripe nalog podrzava.
   */
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  // Javni ključ sme u pregledač, ali ga server vraća tek uz odgovarajući
  // PaymentIntent prijavljenog klijenta.
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeCurrency: (process.env.STRIPE_CURRENCY || "rsd").toLowerCase(),
};
