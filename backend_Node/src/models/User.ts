import mongoose, { Document, Schema } from "mongoose";

/**
 * Tekst zadatka pominje "tri vrste korisnika", ali klijent - fizicko lice i
 * klijent - pravno lice se ponasaju bitno drugacije (pravno lice ne narucuje
 * direktno, nego raspisuje javnu nabavku). Zato su ovde cetiri tipa.
 */
export type UserType =
  | "CLIENT_INDIVIDUAL"
  | "CLIENT_COMPANY"
  | "PRINTER"
  | "ADMIN";

/**
 * Registracija ne pravi aktivan nalog nego zahtev koji ceka administratora.
 * Zahtevi zato nisu zasebna kolekcija - to su korisnici sa statusom PENDING.
 * Posledica koju svesno prihvatamo: korisnicko ime i mejl odbijenog naloga
 * ostaju zauzeti, jer jedinstveni indeksi pokrivaju sve redove.
 */
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * Podaci o instituciji postoje samo za pravna lica i stamparije.
 * U Mongu se ovakav 1:1 odnos ugnjezdava, ne razdvaja u drugu kolekciju.
 *
 * city je ovde iako ga sekcija o registraciji ne pominje: grad stamparije se
 * prikazuje na javnoj strani sa detaljima proizvoda i u tabeli narudzbina.
 * lat/lng sluze kasnije za mapu; ne traze se pri registraciji nego ih
 * stampar unosi na svom profilu.
 */
export interface IInstitution {
  name: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  registrationNumber: string; // maticni broj: tacno 8 cifara
  taxId: string; // PIB: 9 cifara, ne pocinje nulom
}

export interface IUser extends Document {
  username: string;
  password: string; // bcrypt hes, nikada cist tekst
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  profileImage: string;
  type: UserType;
  status: UserStatus;
  institution?: IInstitution;
  createdAt: Date;
}

const InstitutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    lat: { type: Number },
    lng: { type: Number },
    registrationNumber: { type: String, required: true, match: /^[0-9]{8}$/ },
    taxId: { type: String, required: true, match: /^[1-9][0-9]{8}$/ },
  },
  { _id: false } // ugnjezdeni podatak, ne treba mu sopstveni identifikator
);

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },

  // Ako korisnik ne posalje sliku, dobija podrazumevanu koja vec postoji u sistemu.
  profileImage: { type: String, default: "default_profile_image.jpg" },

  type: {
    type: String,
    required: true,
    enum: ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY", "PRINTER", "ADMIN"],
  },
  status: {
    type: String,
    required: true,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING",
  },

  institution: { type: InstitutionSchema, required: false },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>("UserModel", UserSchema, "users");
