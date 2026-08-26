import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Statusi narudzbine i njihova sekvenca prelaza, tacno po tekstu zadatka:
 *
 *   naruceno => [placeno] => u stampi => isporuceno => primljeno
 *
 * PLACENO je u uglastim zagradama jer postoji samo ako se radi deo sa
 * placanjem - to je crvena stavka. Ostavljeno je u nizu da se kasnije ubaci
 * bez menjanja seme.
 *
 * OTKAZANO nije deo sekvence nego izlaz iz nje: klijent sme da otkaze samo
 * narudzbinu koja je jos u statusu NARUCENO, dakle onu za koju stampa nije
 * zapoceta.
 */
export type InvoiceStatus =
  | "ORDERED"
  | "PAID"
  | "PRINTING"
  | "DELIVERED"
  | "RECEIVED"
  | "CANCELLED";

/**
 * Redosled kojim se status sme pomerati unapred. Koristi se za proveru
 * prelaza - da se iz "naruceno" ne moze skociti pravo u "primljeno".
 */
export const SEKVENCA_STATUSA: InvoiceStatus[] = [
  "ORDERED",
  "PAID",
  "PRINTING",
  "DELIVERED",
  "RECEIVED",
];

/** Nazivi koje vidi korisnik. Kod je engleski, prikaz srpski. */
export const NAZIV_STATUSA: Record<InvoiceStatus, string> = {
  ORDERED: "naručeno",
  PAID: "plaćeno",
  PRINTING: "u štampi",
  DELIVERED: "isporučeno",
  RECEIVED: "primljeno",
  CANCELLED: "otkazano",
};

/**
 * Jedna stavka fakture.
 *
 * ODLUKA, suprotna od one u korpi: ovde se SVE prepisuje - naziv proizvoda,
 * sifra, cena po komadu, naziv usluge i njena dodatna cena.
 *
 * Zasto: faktura je istorijski zapis. Ako stampar sutra podigne cenu ili
 * preimenuje proizvod, izdata faktura mora ostati onakva kakva je izdata.
 * Da su ovde stajale samo reference, stara faktura bi se menjala sama od sebe
 * kad god se promeni proizvod - i njen zbir vise ne bi odgovarao stavkama.
 *
 * productId je i dalje tu, ali kao veza za "arhivu proizvoda" i za ocenjivanje
 * primljenih proizvoda, a ne kao izvor podataka za prikaz fakture.
 */
export interface IInvoiceItem {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  code: string;
  name: string;
  unitPrice: number;
  quantity: number;
  color: string;

  /** Prazno ako klijent nije izabrao uslugu stampe. */
  printType: string;
  extraPricePerPiece: number;

  printText: string;
  printImage: string;

  /** Gde i koliko veliko stoji otisak - u procentima slike. Vidi model Cart. */
  printX: number;
  printY: number;
  printScale: number;

  /** (cena po komadu + dodatna cena usluge) * kolicina, izracunato pri izdavanju. */
  lineTotal: number;
}

/**
 * Faktura, odnosno narudzbina - to je jedna te ista stvar.
 *
 * Tekst zadatka: "ako su odabrani proizvodi iz 3 razlicite stamparije, sistem
 * ce evidentirati 3 razlicite fakture". Zato faktura ima TACNO JEDNU
 * stampariju, a zatvaranje korpe pravi onoliko faktura koliko je stamparija.
 *
 * Status stoji NA FAKTURI, ne na stavci. Stampar pomera celu narudzbinu, a
 * dugme "Otkazi" u tabeli stoji pored narudzbine. Arhiva proizvoda se onda
 * cita kao "stavke faktura koje su u tom statusu".
 */
export interface IInvoice extends Document {
  number: string;
  clientId: Types.ObjectId;
  printerId: Types.ObjectId;
  items: Types.DocumentArray<IInvoiceItem>;
  total: number;
  status: InvoiceStatus;

  /**
   * Iz koje javne nabavke je faktura nastala, ako jeste. Fizicka lica ovo
   * polje nemaju - njihove fakture nastaju direktno iz korpe.
   */
  procurementId?: Types.ObjectId;

  /**
   * Podaci o placanju.
   *
   * VAZNO: broj kartice i CVC se NIKADA ne cuvaju. Ostaje samo ono sto sluzi da
   * korisnik prepozna kojom je karticom platio - tip kartice i poslednje cetiri
   * cifre - i oznaka transakcije. Sve ostalo je podatak koji ne sme da postoji
   * u ovoj bazi.
   *
   * Polja nema dok se ne plati; njihovo prisustvo JESTE zapis da je placeno.
   */
  paidAt?: Date;
  paymentBrand?: string;
  paymentLast4?: string;
  paymentRef?: string;

  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  productId: { type: Schema.Types.ObjectId, ref: "ProductModel", required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String, default: "Bela" },
  printType: { type: String, default: "" },
  extraPricePerPiece: { type: Number, default: 0, min: 0 },
  printText: { type: String, default: "" },
  printImage: { type: String, default: "" },
  printX: { type: Number, default: 50 },
  printY: { type: Number, default: 50 },
  printScale: { type: Number, default: 46 },
  lineTotal: { type: Number, required: true, min: 0 },
});

const InvoiceSchema = new Schema<IInvoice>({
  number: { type: String, required: true },
  clientId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  printerId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  items: { type: [InvoiceItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ["ORDERED", "PAID", "PRINTING", "DELIVERED", "RECEIVED", "CANCELLED"],
    default: "ORDERED",
  },
  procurementId: { type: Schema.Types.ObjectId, ref: "ProcurementModel" },

  // Broja kartice i CVC-a ovde NEMA, i ne sme ih biti. Vidi komentar gore.
  paidAt: { type: Date },
  paymentBrand: { type: String },
  paymentLast4: { type: String },
  paymentRef: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IInvoice>("InvoiceModel", InvoiceSchema, "invoices");
