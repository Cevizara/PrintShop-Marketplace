import { Request, Response } from "express";
import { Types } from "mongoose";
import Product from "../models/Product";
import Rating from "../models/Rating";
import User from "../models/User";
import { zaRegex } from "../utils/validation";

/**
 * Sve sto vidi NEREGISTROVANI korisnik na pocetnoj strani i u pretrazi.
 * Nijedna ruta ovde ne trazi prijavu.
 */
export class PublicController {
  /**
   * Pocetna strana: ukupan broj registrovanih stamparija i TOP 5 najbolje
   * ocenjenih proizvoda po broju svidjanja.
   *
   * Broj lajkova se racuna spajanjem sa kolekcijom ratings, a ne citanjem
   * brojaca sa proizvoda - ocene su zasebna kolekcija (vidi model Rating).
   * Krece se od proizvoda, pa i proizvod bez ijedne ocene moze uci u TOP 5
   * ako ih ima manje od pet ocenjenih.
   */
  pocetna = async (_req: Request, res: Response): Promise<void> => {
    try {
      const brojStamparija = await User.countDocuments({
        type: "PRINTER",
        status: "APPROVED",
      });

      const topProizvodi = await Product.aggregate([
        {
          $lookup: {
            from: "ratings",
            localField: "_id",
            foreignField: "productId",
            as: "ocene",
          },
        },
        {
          $addFields: {
            likes: {
              $size: { $filter: { input: "$ocene", as: "o", cond: { $eq: ["$$o.value", 1] } } },
            },
            dislikes: {
              $size: { $filter: { input: "$ocene", as: "o", cond: { $eq: ["$$o.value", -1] } } },
            },
          },
        },
        // Pri istom broju lajkova redosled odredjuje naziv, da lista ne bi
        // menjala poredak izmedju dva ucitavanja.
        { $sort: { likes: -1, name: 1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "printerId",
            foreignField: "_id",
            as: "stampar",
          },
        },
        { $unwind: { path: "$stampar", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: 1,
            categoryName: 1,
            mainImage: 1,
            likes: 1,
            dislikes: 1,
            printerName: "$stampar.institution.name",
            printerCity: "$stampar.institution.city",
          },
        },
      ]);

      res.json({ printerCount: brojStamparija, topProducts: topProizvodi });
    } catch (greska) {
      console.error("pocetna:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Kategorije za padajucu listu.
   * Tekst zadatka: "u listi se nalaze samo one kategorije gde postoje trenutno
   * aktivni proizvodi na stanju".
   */
  kategorijeSaZalihama = async (_req: Request, res: Response): Promise<void> => {
    try {
      const nazivi = await Product.distinct("categoryName", { stock: { $gt: 0 } });
      res.json(nazivi.sort((a, b) => a.localeCompare(b, "sr")));
    } catch (greska) {
      console.error("kategorijeSaZalihama:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Pretraga po nazivu proizvoda i/ili kategoriji, sa abecednim sortiranjem.
   *
   * Proizvodi kojih nema na stanju se ne prikazuju - tekst zadatka: "U pretrazi
   * se ne pojavljuju proizvodi koje stamparije nemaju na stanju".
   */
  pretraga = async (req: Request, res: Response): Promise<void> => {
    try {
      const naziv = String(req.query.name || "").trim();
      const kategorija = String(req.query.category || "").trim();
      const smer = String(req.query.sort || "asc") === "desc" ? -1 : 1;

      const uslov: Record<string, unknown> = { stock: { $gt: 0 } };

      if (naziv) {
        // Unos se prvo ocisti, da znakovi poput "(" ili "*" ne promene
        // znacenje upita niti ga sruse.
        uslov.name = { $regex: zaRegex(naziv), $options: "i" };
      }

      // "Sve kategorije" je podrazumevana vrednost i ne filtrira nista.
      if (kategorija && kategorija !== "Sve kategorije") {
        uslov.categoryName = kategorija;
      }

      const proizvodi = await Product.find(uslov)
        // Bez collation-a bi "Šolja" zavrsila iza "Zahvalnica", jer se poredi
        // po kodu karaktera. Ovako se postuje srpski abecedni red.
        .collation({ locale: "sr", strength: 1 })
        .sort({ name: smer })
        .populate("printerId", "institution.name institution.city");

      res.json(
        proizvodi.map((proizvod) => {
          const stampar = proizvod.printerId as unknown as {
            institution?: { name?: string; city?: string };
          };

          return {
            _id: proizvod._id,
            name: proizvod.name,
            categoryName: proizvod.categoryName,
            subcategoryName: proizvod.subcategoryName,
            mainImage: proizvod.mainImage,
            printerName: stampar?.institution?.name ?? "",
            printerCity: stampar?.institution?.city ?? "",
          };
        })
      );
    } catch (greska) {
      console.error("pretraga:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Detalji proizvoda za NEREGISTROVANOG korisnika: naziv, stamparija, grad,
   * broj svidjanja i nesvidjanja, i galerija slika.
   *
   * Cena, opis, boje i usluge stampe se namerno NE salju. To su "prosirene
   * informacije" koje po tekstu zadatka vidi tek prijavljeni klijent - pa ih
   * server ne salje uopste, umesto da se oslanjamo na to da ih strana sakrije.
   */
  detaljiProizvoda = async (req: Request, res: Response): Promise<void> => {
    try {
      // Express 5 tipizira parametar rute kao string ili niz stringova.
      const id = String(req.params.id);

      // Bez ove provere Mongoose baca izuzetak na svaki nevalidan ID iz URL-a.
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      const proizvod = await Product.findById(id).populate(
        "printerId",
        "institution.name institution.city"
      );

      if (!proizvod) {
        res.status(404).json({ message: "Proizvod nije pronađen." });
        return;
      }

      const stampar = proizvod.printerId as unknown as {
        institution?: { name?: string; city?: string };
      };

      const productId = proizvod._id as Types.ObjectId;
      const [likes, dislikes] = await Promise.all([
        Rating.countDocuments({ productId, value: 1 }),
        Rating.countDocuments({ productId, value: -1 }),
      ]);

      res.json({
        _id: proizvod._id,
        name: proizvod.name,
        categoryName: proizvod.categoryName,
        subcategoryName: proizvod.subcategoryName,
        mainImage: proizvod.mainImage,
        additionalImages: proizvod.additionalImages,
        printerName: stampar?.institution?.name ?? "",
        printerCity: stampar?.institution?.city ?? "",
        likes,
        dislikes,
      });
    } catch (greska) {
      console.error("detaljiProizvoda:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
