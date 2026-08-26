import mongoose, { Document, Schema } from "mongoose";

/**
 * Atomicni brojac. Za sada ga koristi samo numerisanje faktura.
 *
 * ZASTO POSTOJI, a ne countDocuments() + 1:
 *
 * Prva verzija projekta je broj fakture racunala kao "koliko ih ima, plus
 * jedan". To ima dve greske koje se ne vide dok se ne dese:
 *
 *  1. Dve narudzbine u istom trenutku procitaju isti broj i obe dobiju isti
 *     broj fakture. Jedinstveni indeks ce jednu odbiti, i klijent ostaje bez
 *     narudzbine iako je lager vec skinut.
 *  2. Brisanje bilo koje fakture trajno lomi niz - sledeca dobija broj koji
 *     vec postoji.
 *
 * Ovde se broj uzima jednim atomicnim $inc: baza garantuje da dve istovremene
 * naredbe dobiju dva razlicita broja, jer se citanje i uvecavanje desavaju kao
 * jedna operacija.
 *
 * _id je NAZIV brojaca ("invoice", kasnije "procurement"), a ne ObjectId -
 * tako se brojac pronalazi po imenu, bez posebnog upita.
 */
// Document<string>: identifikator je tekst ("invoice"), a ne ObjectId.
export interface ICounter extends Document<string> {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const Counter = mongoose.model<ICounter>("CounterModel", CounterSchema, "counters");

/**
 * Sledeca vrednost brojaca. Jedan poziv ka bazi, bez citanja unapred.
 *
 * upsert: prvi poziv pravi zapis, pa brojac ne mora da se sprema u seed skriptu.
 * returnDocument "after": vraca vrednost POSLE uvecanja, sto je broj koji
 * pripada bas ovom pozivu.
 */
export async function sledeciBroj(naziv: string): Promise<number> {
  const zapis = await Counter.findOneAndUpdate(
    { _id: naziv },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return zapis!.seq;
}

/**
 * Broj fakture u obliku PH-2026-0001.
 *
 * Godina je u oznaci radi citljivosti, ali NIJE deo jedinstvenosti - niz se ne
 * resetuje po godini. Da se resetuje, brojac bi morao da pamti i godinu, a
 * dobitak bi bio samo kraci broj.
 */
export async function sledeciBrojFakture(): Promise<string> {
  const broj = await sledeciBroj("invoice");
  const godina = new Date().getFullYear();
  return `PH-${godina}-${String(broj).padStart(4, "0")}`;
}

export default Counter;
