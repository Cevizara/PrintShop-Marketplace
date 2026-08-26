import mongoose from "mongoose";
import { env } from "./env";

/**
 * Povezivanje na bazu.
 *
 * Tekst zadatka: "Podrazumevati da se baza podataka inicijalno kreira i
 * popunjava nezavisno od ove aplikacije (tj. tabele ili kolekcije u bazi ne
 * treba kreirati iz same aplikacije, vec nezavisno od nje)."
 *
 * Zato su autoCreate i autoIndex iskljuceni: aplikacija se samo povezuje na
 * vec postojecu bazu i nikada sama ne pravi kolekcije ni indekse.
 * To radi iskljucivo skript: npm run seed
 */
export async function connectToDatabase(): Promise<void> {
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);

  await mongoose.connect(env.mongoUri);
  console.log("Povezan na bazu:", env.mongoUri);
}
