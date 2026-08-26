import { Request, Response } from "express";
import Invoice from "../models/Invoice";
import Rating from "../models/Rating";

/**
 * Statusi koji se broje kao ostvaren promet.
 *
 * Otkazana narudzbina nije promet - roba nikada nije otisla, a lager je vracen.
 * Sve ostalo jeste: narucena i placena su obavezujuce, a u stampi, isporucena i
 * primljena su vec i odradjene.
 */
const PROMETNI_STATUSI = ["ORDERED", "PAID", "PRINTING", "DELIVERED", "RECEIVED"];

/** Datum pre zadatog broja meseci - granica za "poslednji kvartal" i "mesec dana". */
function preMeseci(broj: number): Date {
  const granica = new Date();
  granica.setMonth(granica.getMonth() - broj);
  return granica;
}

/**
 * Statistike koje administrator vidi kao grafikone.
 *
 * Tekst zadatka trazi tri:
 *   1. promet stamparija u poslednjem kvartalu     - stubicasti
 *   2. najcesce narucivani proizvodi u mesec dana  - pita
 *   3. kretanje ocene proizvoda kroz vreme         - linijski
 *
 * Sva tri se racunaju ovde. Prva dva iz kolekcije invoices, trece iz ratings -
 * a trece je uopste moguce zato sto su ocene zasebna kolekcija sa datumom po
 * svakoj oceni (vidi model Rating): brojac na proizvodu ne bi cuvao istoriju.
 */
export class StatsController {
  /**
   * Promet stamparija u poslednjem kvartalu - stubicasti grafikon.
   *
   * Tekst zadatka: "opadajuca lista stamparija koje su u poslednjem kvartalu
   * (3 meseca) ostvarile najveci promet ka klijentima, u vidu stubicastog
   * grafikona".
   *
   * "Opadajuca" je deo zahteva, pa se sortira na serveru - strana samo crta.
   * Otkazane narudzbine ne ulaze u promet: roba nikada nije otisla.
   */
  prometStamparija = async (_req: Request, res: Response): Promise<void> => {
    try {
      const redovi = await Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: preMeseci(3) },
            status: { $in: PROMETNI_STATUSI },
          },
        },
        {
          $group: {
            _id: "$printerId",
            total: { $sum: "$total" },
            invoiceCount: { $sum: 1 },
          },
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "stampar" } },
        // Faktura moze nadziveti obrisanu stampariju; takav red nema sta da prikaze.
        { $unwind: "$stampar" },
        {
          $project: {
            _id: 0,
            printerId: "$_id",
            name: { $ifNull: ["$stampar.institution.name", "$stampar.username"] },
            city: { $ifNull: ["$stampar.institution.city", ""] },
            total: 1,
            invoiceCount: 1,
          },
        },
        { $sort: { total: -1 } },
      ]);

      res.json(redovi);
    } catch (greska) {
      console.error("prometStamparija:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Najcesce narucivani proizvodi u poslednjih mesec dana - pita grafikon.
   *
   * Tekst zadatka: "lista proizvoda koji su najcesce narucivani u poslednjem
   * mesec dana (po kolicini / procentu udela u svim proizvodima) u vidu pita
   * grafikona".
   *
   * Broji se KOLICINA, ne broj faktura: dve narudzbine po jedan komad nisu isto
   * sto i jedna narudzbina od sto komada, a "pita" prikazuje udeo.
   *
   * Grupise se po NAZIVU proizvoda, ne po identifikatoru: isti proizvod kod tri
   * stamparije su tri razlicita zapisa u bazi, a na grafikonu "najcesce
   * narucivanih proizvoda" treba da budu jedno parce.
   */
  narucivaniProizvodi = async (_req: Request, res: Response): Promise<void> => {
    try {
      const redovi = await Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: preMeseci(1) },
            status: { $in: PROMETNI_STATUSI },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        { $project: { _id: 0, name: "$_id", quantity: 1, revenue: 1 } },
        { $sort: { quantity: -1 } },
      ]);

      const ukupno = redovi.reduce((zbir, r) => zbir + r.quantity, 0);

      res.json(
        redovi.map((r) => ({
          ...r,
          // Udeo racuna server, da se isti broj ne bi racunao na dva mesta.
          share: ukupno ? Math.round((r.quantity / ukupno) * 1000) / 10 : 0,
        }))
      );
    } catch (greska) {
      console.error("narucivaniProizvodi:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
  /**
   * Kretanje ocene kroz vreme, po proizvodu.
   *
   * Vraca SIROVE dogadjaje - za svaki proizvod niz parova (datum, vrednost),
   * poredjanih po vremenu. Zbir se racuna na klijentu.
   *
   * Zasto tako, a ne da server posalje gotove tacke linije: broj ocena po
   * proizvodu je mali, a ovako klijent moze da iskljuci proizvod iz prikaza -
   * sto tekst zadatka izricito trazi - bez novog poziva ka serveru.
   *
   * Proizvodi bez ijedne ocene se ne pojavljuju: linija bez tacaka nema sta da
   * prikaze, a samo bi zatrpala legendu.
   */
  kretanjeOcena = async (_req: Request, res: Response): Promise<void> => {
    try {
      const redovi = await Rating.aggregate([
        // Sortiranje ide PRE grupisanja, da $push slozi dogadjaje po vremenu.
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: "$productId",
            points: { $push: { date: "$createdAt", value: "$value" } },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "proizvod",
          },
        },
        // Ocena moze da nadzivi proizvod koji je obrisan zajedno sa svojom
        // stamparijom. Takav zapis nema sta da prikaze, pa ispada iz rezultata.
        { $unwind: "$proizvod" },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            name: "$proizvod.name",
            categoryName: "$proizvod.categoryName",
            points: 1,
          },
        },
        { $sort: { name: 1 } },
      ]);

      res.json(redovi);
    } catch (greska) {
      console.error("kretanjeOcena:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
