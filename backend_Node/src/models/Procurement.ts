import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Stanje javne nabavke.
 *
 *   OPEN     - licitacija traje, stamparije mogu da salju ponude
 *   AWARDED  - rok je prosao, posao je dodeljen najnizoj ispravnoj ponudi
 *   FAILED   - rok je prosao, a nijedna ponuda nije bila upotrebljiva
 *              (nije ih ni bilo, ili nijedna nije imala dovoljno na stanju)
 */
export type ProcurementStatus = "OPEN" | "AWARDED" | "FAILED";

/**
 * Jedna trazena stavka.
 *
 * Ovo je OPIS onoga sto se trazi, a ne pokazivac na tudji proizvod. Kada
 * pravno lice iz korpe raspise nabavku, izabrani proizvodi sluze samo da opisu
 * potrebu - od koga se kupuje tek odlucuje licitacija.
 *
 * Zato se ovde prepisuju naziv, kategorija i potkategorija, a NE productId:
 * proizvod u ovoj bazi pripada tacno jednoj stampariji (printerId + code je
 * jedinstven), pa bi pokazivac na njega znacio da samo ta jedna stamparija moze
 * da se javi - a to nije licitacija.
 *
 * Koji svoj proizvod nudi za koju stavku, kaze sam stampar u ponudi. Vidi Bid.
 */
export interface IProcurementItem {
  _id: Types.ObjectId;
  name: string;
  categoryName: string;
  subcategoryName: string;
  quantity: number;

  /** Iz cega je stavka nastala - cuva se samo kao trag, nikad se ne cita za posao. */
  sourceProductId?: Types.ObjectId;
}

export interface IProcurement extends Document {
  number: string;
  clientId: Types.ObjectId;
  items: Types.DocumentArray<IProcurementItem>;

  createdAt: Date;
  /** Rok za slanje ponuda. Tekst zadatka: licitacija traje 10 minuta. */
  deadline: Date;

  status: ProcurementStatus;

  /**
   * Kada je nabavka zakljucena.
   *
   * Postavlja se ATOMICNO, pre samog racunanja pobednika, i sluzi kao brava:
   * zakljucivanje se okida lenjo, sa vise strana (kad se prijavi ustanova, kad
   * stampar otvori spisak), pa bi bez toga dva istovremena poziva mogla da
   * naprave dve fakture za istu nabavku.
   */
  settledAt?: Date;

  winnerPrinterId?: Types.ObjectId;
  winnerBidId?: Types.ObjectId;
  winnerTotal?: number;
  invoiceId?: Types.ObjectId;

  /** Zasto nije dodeljena, ako nije. */
  failureReason?: string;
}

const ProcurementItemSchema = new Schema<IProcurementItem>({
  name: { type: String, required: true, trim: true },
  categoryName: { type: String, required: true },
  subcategoryName: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  sourceProductId: { type: Schema.Types.ObjectId, ref: "ProductModel" },
});

const ProcurementSchema = new Schema<IProcurement>({
  number: { type: String, required: true },
  clientId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  items: { type: [ProcurementItemSchema], required: true },

  createdAt: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },

  status: {
    type: String,
    required: true,
    enum: ["OPEN", "AWARDED", "FAILED"],
    default: "OPEN",
  },

  settledAt: { type: Date, default: null },
  winnerPrinterId: { type: Schema.Types.ObjectId, ref: "UserModel" },
  winnerBidId: { type: Schema.Types.ObjectId, ref: "BidModel" },
  winnerTotal: { type: Number },
  invoiceId: { type: Schema.Types.ObjectId, ref: "InvoiceModel" },
  failureReason: { type: String },
});

export default mongoose.model<IProcurement>(
  "ProcurementModel",
  ProcurementSchema,
  "procurements"
);
