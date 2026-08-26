import { Request, Response } from "express";
import { Types } from "mongoose";
import Category from "../models/Category";
import Product from "../models/Product";

/**
 * Kategorije stampanih proizvoda.
 *
 * Tekst zadatka o administratoru kaze samo: "Moze dodati novu kategoriju i
 * unutar nje isto to za potkategorije." Preimenovanje i brisanje se NE rade,
 * i to je namerno, a ne propust:
 *
 *  - naziv kategorije se cuva i na proizvodu (Product.categoryName), da bi
 *    pretraga po kategoriji radila bez spajanja kolekcija. Preimenovanje bi
 *    zato moralo da azurira i sve proizvode, u jednoj transakciji;
 *  - brisanje bi ostavilo proizvode koji pokazuju na kategoriju koje nema.
 *
 * Oboje se moze uraditi, ali nijedno se ne trazi - pa se ne radi.
 */
export class CategoryController {
  /**
   * Sve kategorije sa potkategorijama.
   *
   * Ovo NIJE javna ruta iz PublicController-a. Ona vraca samo nazive kategorija
   * koje imaju proizvoda na stanju, jer tako trazi padajuca lista na pocetnoj
   * strani. Ovde treba pun spisak sa potkategorijama - stamparu, da bi mogao da
   * svrsta novi proizvod, i administratoru, da vidi sta postoji.
   */
  sve = async (_req: Request, res: Response): Promise<void> => {
    try {
      const kategorije = await Category.find().collation({ locale: "sr", strength: 1 }).sort({ name: 1 });
      res.json(kategorije);
    } catch (greska) {
      console.error("sve:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Isti spisak, ali sa brojem proizvoda po kategoriji.
   * Administratoru pokazuje sta se stvarno koristi, a sta stoji prazno.
   */
  saBrojem = async (_req: Request, res: Response): Promise<void> => {
    try {
      const kategorije = await Category.find()
        .collation({ locale: "sr", strength: 1 })
        .sort({ name: 1 });

      // Jedan upit za sve kategorije umesto po jednog upita za svaku - inace bi
      // broj poziva ka bazi rastao sa brojem kategorija.
      const brojevi = await Product.aggregate<{ _id: string; broj: number }>([
        { $group: { _id: "$categoryName", broj: { $sum: 1 } } },
      ]);

      const poNazivu = new Map(brojevi.map((b) => [b._id, b.broj]));

      res.json(
        kategorije.map((k) => ({
          _id: k._id,
          name: k.name,
          subcategories: k.subcategories,
          productCount: poNazivu.get(k.name) ?? 0,
        }))
      );
    } catch (greska) {
      console.error("saBrojem:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Nova kategorija. */
  dodajKategoriju = async (req: Request, res: Response): Promise<void> => {
    try {
      const naziv = String(req.body.name || "").trim();

      if (!naziv) {
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "name", message: "Naziv kategorije je obavezno polje." }],
        });
        return;
      }

      // Poredjenje bez obzira na velika/mala slova i dijakritiku: "Šolje" i
      // "solje" su ista kategorija, i ne smeju obe da postoje.
      const postoji = await Category.findOne({ name: naziv }).collation({
        locale: "sr",
        strength: 1,
      });

      if (postoji) {
        res.status(409).json({
          message: "Kategorija već postoji.",
          errors: [{ field: "name", message: `Kategorija "${postoji.name}" već postoji.` }],
        });
        return;
      }

      const kategorija = await Category.create({ name: naziv, subcategories: [] });

      res.status(201).json({ message: `Kategorija "${naziv}" je dodata.`, category: kategorija });
    } catch (greska) {
      console.error("dodajKategoriju:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Nova potkategorija unutar postojece kategorije. */
  dodajPotkategoriju = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const naziv = String(req.body.name || "").trim();

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator kategorije." });
        return;
      }

      if (!naziv) {
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "name", message: "Naziv potkategorije je obavezno polje." }],
        });
        return;
      }

      const kategorija = await Category.findById(id);
      if (!kategorija) {
        res.status(404).json({ message: "Kategorija nije pronađena." });
        return;
      }

      const uporedivo = naziv.toLocaleLowerCase("sr");
      if (kategorija.subcategories.some((p) => p.name.toLocaleLowerCase("sr") === uporedivo)) {
        res.status(409).json({
          message: "Potkategorija već postoji.",
          errors: [
            { field: "name", message: `Potkategorija "${naziv}" već postoji u ovoj kategoriji.` },
          ],
        });
        return;
      }

      kategorija.subcategories.push({ _id: new Types.ObjectId(), name: naziv });
      await kategorija.save();

      res.status(201).json({
        message: `Potkategorija "${naziv}" je dodata u "${kategorija.name}".`,
        category: kategorija,
      });
    } catch (greska) {
      console.error("dodajPotkategoriju:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
