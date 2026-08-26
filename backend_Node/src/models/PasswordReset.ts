import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Token za ponistavanje zaboravljene lozinke.
 *
 * Tekst zadatka: link vazi 5 minuta od trenutka kada je korisnik zatrazio
 * ponistavanje. Rok se proverava NA SERVERU, pri svakoj upotrebi tokena -
 * tajmer u pregledacu nije provera, jer se strana moze osveziti.
 *
 * used je odvojeno polje jer istekao i vec iskoriscen nisu isto stanje:
 * token moze biti upotrebljen i pre isteka roka, i tada mora prestati da vazi.
 * Bez toga bi isti link radio proizvoljno mnogo puta tokom tih 5 minuta.
 */
export interface IPasswordReset extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  userId: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPasswordReset>(
  "PasswordResetModel",
  PasswordResetSchema,
  "password_resets"
);
