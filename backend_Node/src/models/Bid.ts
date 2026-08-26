import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Jedna stavka ponude: cime stampar pokriva jednu trazenu stavku, i po kojoj ceni.
 *
 * productId je proizvod TE stamparije. To je cela poenta ovog modela: nabavka
 * opisuje sta se trazi, a stampar sam kaze cime to ispunjava. Bez toga bi
 * sistem morao da pogadja - najverovatnije poredjenjem naziva - a naziv istog
 * proizvoda se razlikuje od stamparije do stamparije.
 *
 * Uz to, "dovoljna kolicina svakog proizvoda na stanju", koju tekst zadatka
 * trazi kao uslov za pobedu, ima smisla samo nad konkretnim proizvodom - a
 * jedini koji zna koji je to, jeste sam ponudjac.
 */
export interface IBidLine {
  _id: Types.ObjectId;
  /** Na koju trazenu stavku se odnosi. */
  itemId: Types.ObjectId;
  productId: Types.ObjectId;
  /** Prepisano u trenutku slanja ponude, da se ponuda kasnije ne menja sama. */
  productName: string;
  productCode: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface IBid extends Document {
  procurementId: Types.ObjectId;
  printerId: Types.ObjectId;
  lines: Types.DocumentArray<IBidLine>;
  total: number;
  createdAt: Date;
}

const BidLineSchema = new Schema<IBidLine>({
  itemId: { type: Schema.Types.ObjectId, required: true },
  productId: { type: Schema.Types.ObjectId, ref: "ProductModel", required: true },
  productName: { type: String, required: true },
  productCode: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
});

/**
 * Ponuda stamparije po jednoj javnoj nabavci.
 *
 * Tekst zadatka: "Stampar salje za svoju stampariju JEDNU ponudu (sa svim
 * trazenim proizvodima) po javnoj nabavci." Zato jedinstveni indeks nad
 * (procurementId, printerId) - jedna stamparija, jedna ponuda.
 */
const BidSchema = new Schema<IBid>({
  procurementId: { type: Schema.Types.ObjectId, ref: "ProcurementModel", required: true },
  printerId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  lines: { type: [BidLineSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IBid>("BidModel", BidSchema, "bids");
