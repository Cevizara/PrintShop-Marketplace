import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Svidjanje (lajk) ili nesvidjanje (dislajk) proizvoda.
 *
 * Zasto zasebna kolekcija, a ne brojac na proizvodu:
 *  - TOP 5 na pocetnoj strani trazi broj lajkova po proizvodu,
 *  - strana sa detaljima trazi i lajkove i dislajkove,
 *  - administratorski linijski grafikon trazi KRETANJE ocene kroz vreme,
 *    a to je moguce samo ako svaka pojedinacna ocena ima svoj datum.
 * Brojac na proizvodu ne bi cuvao istoriju.
 *
 * Uz to, ovako se lako namece pravilo "jedan klijent, najvise jedna ocena po
 * proizvodu" - jedinstvenim indeksom nad (productId, userId).
 *
 * createdAt je datum prve ocene, updatedAt datum poslednje izmene. Razdvojeni
 * su namerno: da promena misljenja ne prepise trenutak kada je ocena nastala.
 */
export interface IRating extends Document {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  value: 1 | -1; // 1 = svidja mi se, -1 = ne svidja mi se

  /**
   * Komentar uz ocenu.
   *
   * ODLUKA: komentar stoji NA OCENI, a ne u zasebnoj kolekciji.
   *
   * Tekst zadatka ih pominje zajedno - "klijent moze ostaviti sviđanje (lajk)
   * ili nesviđanje (dislajk) I KOMENTAR za taj proizvod" - dakle to je jedan
   * cin, ne dva. Posledica koju svesno prihvatamo: jedan klijent ima najvise
   * jedan komentar po proizvodu, jer to vec namece jedinstveni indeks
   * (productId, userId). Ako isti proizvod naruci dvaput, drugi put menja svoj
   * postojeci komentar umesto da doda novi.
   *
   * Zasebna kolekcija bi dozvolila vise komentara po proizvodu, ali bi trazila
   * jos jedan upit na strani sa detaljima, i jos jedno mesto na kojem se pazi
   * da komentar sme da ostavi samo onaj ko je proizvod primio.
   *
   * Prazan komentar je dozvoljen: tekst dozvoljava i samo lajk, bez teksta.
   */
  comment: string;

  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>({
  productId: { type: Schema.Types.ObjectId, ref: "ProductModel", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  value: { type: Number, required: true, enum: [1, -1] },
  comment: { type: String, default: "", trim: true, maxlength: 600 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRating>("RatingModel", RatingSchema, "ratings");
