import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Usluga stampe: specijalizovan tip stampe koji povecava cenu po komadu i ima
 * maksimalne dimenzije otiska (npr. "Direktna stampa na tekstil (DTG)").
 *
 * Ugnjezdena je u proizvod jer se uvek cita zajedno s njim, i jer u JSON fajlu
 * za uvoz (Prilog 1) stize kao niz unutar proizvoda.
 */
export interface IPrintService {
  _id: Types.ObjectId;
  code: string; // idUsluge iz JSON fajla, npr. "USL-01"
  printType: string; // tipStampe
  extraPricePerPiece: number; // dodatnaCenaPoKomadu
  maxWidthMm: number; // maxSirinaMm
  maxHeightMm: number; // maxVisinaMm
}

export interface IProduct extends Document {
  printerId: Types.ObjectId;
  code: string; // sifra, npr. "PR-001"
  name: string;
  description: string;
  categoryId: Types.ObjectId;
  categoryName: string;
  subcategoryName: string;
  unitPrice: number;
  stock: number;
  availableColors: string[];
  mainImage: string;
  additionalImages: string[];
  printServices: Types.DocumentArray<IPrintService>;
  createdAt: Date;
}

const PrintServiceSchema = new Schema<IPrintService>({
  code: { type: String, required: true, trim: true },
  printType: { type: String, required: true, trim: true },
  extraPricePerPiece: { type: Number, required: true, min: 0 },
  maxWidthMm: { type: Number, required: true, min: 1 },
  maxHeightMm: { type: Number, required: true, min: 1 },
});

const ProductSchema = new Schema<IProduct>({
  printerId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },

  categoryId: { type: Schema.Types.ObjectId, ref: "CategoryModel", required: true },
  // Naziv kategorije se cuva i ovde, pored reference. Pretraga po kategoriji i
  // spisak kategorija "koje imaju proizvoda na stanju" tako rade bez spajanja
  // kolekcija. Cena: pri preimenovanju kategorije mora se azurirati i ovde.
  categoryName: { type: String, required: true },
  subcategoryName: { type: String, default: "" },

  unitPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  availableColors: { type: [String], default: ["Bela"] },

  mainImage: { type: String, default: "default_product_image.svg" },
  // Galerija: tekst zadatka dozvoljava najvise tri dodatne slike.
  additionalImages: {
    type: [String],
    default: [],
    validate: {
      validator: (slike: string[]) => slike.length <= 3,
      message: "Galerija moze imati najvise 3 dodatne slike.",
    },
  },

  printServices: { type: [PrintServiceSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IProduct>("ProductModel", ProductSchema, "products");
