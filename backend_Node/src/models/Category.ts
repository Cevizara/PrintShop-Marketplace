import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubcategory {
  _id: Types.ObjectId;
  name: string;
}

export interface ICategory extends Document {
  name: string;
  subcategories: Types.DocumentArray<ISubcategory>;
}

const SubcategorySchema = new Schema<ISubcategory>({
  name: { type: String, required: true, trim: true },
});

/**
 * Kategorije i potkategorije stampanih proizvoda.
 *
 * Potkategorije su ugnjezdene jer nikada ne postoje same za sebe - uvek se
 * citaju i menjaju zajedno sa svojom kategorijom.
 *
 * Nazivi se cuvaju na srpskom ("Kreativne stampe", "Stampa malih formata"...)
 * jer se pod tim imenima pojavljuju i u tekstu zadatka i u JSON fajlu za uvoz
 * lager liste, gde se kategorija prepoznaje bas po nazivu.
 */
const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, trim: true },
  subcategories: { type: [SubcategorySchema], default: [] },
});

export default mongoose.model<ICategory>("CategoryModel", CategorySchema, "categories");
