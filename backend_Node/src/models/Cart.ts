import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Jedna stavka u korpi.
 *
 * ODLUKA: stavka cuva SAMO ono sto je klijent izabrao - proizvod, kolicinu,
 * boju, uslugu stampe i pripremu. Naziv proizvoda, cena i naziv stamparije se
 * NE prepisuju ovde, nego se citaju iz proizvoda pri svakom prikazu.
 *
 * Zasto: korpa je zeljena lista, ne dokument. Ako stampar u medjuvremenu
 * promeni cenu, klijent u korpi mora videti NOVU cenu - onu koju ce stvarno
 * platiti. Prepisana cena bi tiho zastarela, a to je tacno ona vrsta mrtvog
 * polja zbog kojeg je u prvoj verziji nastao problem sa cart.printerId.
 *
 * Faktura radi obrnuto i namerno: ona prepisuje sve, jer je istorijski zapis.
 * Vidi model Invoice.
 */
export interface ICartItem {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;

  /** Boja iz padajuce liste; ako proizvod nema boje, podrazumeva se bela. */
  color: string;

  /**
   * Izabrana usluga stampe. Cuva se identifikator ugnjezdene usluge unutar
   * proizvoda - naziv i dodatna cena se citaju iz proizvoda, kao i sve ostalo.
   * Prazno znaci da klijent nije izabrao nijednu uslugu.
   */
  printServiceId?: Types.ObjectId;

  /** Tekst koji se stampa na proizvodu. */
  printText: string;

  /**
   * Slicica koja se stampa na proizvodu, otpremljena kroz FileUpload.
   * Cuva se u uploads/print.
   */
  printImage: string;

  /**
   * Gde i koliko veliko stoji otisak na slici proizvoda.
   *
   * printX i printY su SREDISTE otiska, u procentima sirine i visine slike.
   * printScale je sirina otiska, u procentima sirine slike.
   *
   * Procenti, a ne pikseli: slika proizvoda se prikazuje u razlicitim
   * velicinama (strana za pripremu, korpa, kasnije stamparski pregled), pa bi
   * pikseli vazili samo na onoj sirini na kojoj su izmereni.
   *
   * Ovo je podatak koji STAMPARIJA dobija uz narudzbinu - bez njega bi znala
   * sta se stampa, ali ne i gde.
   */
  printX: number;
  printY: number;
  printScale: number;

  addedAt: Date;
}

/**
 * Korpa jednog klijenta.
 *
 * Jedna korpa po klijentu - jedinstveni indeks nad clientId. Tekst zadatka
 * govori o "trenutnoj elektronskoj korpi", dakle o jednoj, a ne o vise njih.
 *
 * Zasto zasebna kolekcija a ne ugnjezdeno u korisnika: korpa se menja mnogo
 * cesce od naloga, i cita se sama za sebe. Ugnjezdena bi znacila da svako
 * dodavanje u korpu upisuje ceo korisnicki dokument.
 */
export interface ICart extends Document {
  clientId: Types.ObjectId;
  items: Types.DocumentArray<ICartItem>;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: Schema.Types.ObjectId, ref: "ProductModel", required: true },
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String, default: "Bela", trim: true },
  printServiceId: { type: Schema.Types.ObjectId },
  printText: { type: String, default: "", trim: true },
  printImage: { type: String, default: "" },
  printX: { type: Number, default: 50, min: 0, max: 100 },
  printY: { type: Number, default: 50, min: 0, max: 100 },
  printScale: { type: Number, default: 46, min: 5, max: 100 },
  addedAt: { type: Date, default: Date.now },
});

const CartSchema = new Schema<ICart>({
  clientId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  items: { type: [CartItemSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICart>("CartModel", CartSchema, "carts");
