import { Request, Response } from "express";
import { Types } from "mongoose";
import Invoice from "../models/Invoice";
import Rating from "../models/Rating";

/** Koliko poslednjih komentara ide na stranu sa detaljima - tekst kaze pet. */
const BROJ_KOMENTARA = 5;

export class RatingController {
  /**
   * Ocena i komentar za jedan proizvod.
   *
   * Tekst zadatka: "Za svaki PRIMLJENI proizvod, klijent moze ostaviti sviđanje
   * (lajk) ili nesviđanje (dislajk) i komentar za taj proizvod."
   *
   * Rec "primljeni" je uslov, ne opis. Zato se pre upisa proverava da ovaj
   * klijent zaista ima fakturu u statusu RECEIVED koja sadrzi ovaj proizvod.
   * Bez te provere bi svako mogao da oceni bilo sta, ukljucujuci proizvode koje
   * nikada nije narucio.
   *
   * Ocena i komentar idu zajedno, jednim upisom - vidi model Rating.
   */
  oceni = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.body.productId ?? "");
      const vrednost = Number(req.body.value);
      const komentar = String(req.body.comment ?? "").trim();

      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      if (vrednost !== 1 && vrednost !== -1) {
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "value", message: "Ocena mora biti sviđanje ili nesviđanje." }],
        });
        return;
      }

      if (komentar.length > 600) {
        res.status(400).json({
          message: "Podaci nisu ispravni.",
          errors: [{ field: "comment", message: "Komentar sme imati najviše 600 karaktera." }],
        });
        return;
      }

      const primljen = await Invoice.exists({
        clientId: req.user!.id,
        status: "RECEIVED",
        "items.productId": new Types.ObjectId(productId),
      });

      if (!primljen) {
        res.status(403).json({
          message:
            "Ocenjuju se samo primljeni proizvodi. Potvrdite prijem narudžbine u arhivi proizvoda.",
        });
        return;
      }

      // Jedan klijent, najvise jedna ocena po proizvodu - to vec namece
      // jedinstveni indeks (productId, userId). Zato upsert, a ne insert:
      // promena misljenja menja postojecu ocenu umesto da padne na duplikatu.
      //
      // createdAt se postavlja SAMO pri nastanku ($setOnInsert): datum kada je
      // ocena prvi put data ne sme da se pomeri kad se ocena promeni. Od toga
      // zavisi administratorski grafikon "kretanje ocene kroz vreme".
      const ocena = await Rating.findOneAndUpdate(
        { productId, userId: req.user!.id },
        {
          $set: { value: vrednost, comment: komentar, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );

      res.json({
        message: "Ocena je sačuvana.",
        rating: {
          _id: ocena!._id,
          productId: ocena!.productId,
          value: ocena!.value,
          comment: ocena!.comment,
          createdAt: ocena!.createdAt,
          updatedAt: ocena!.updatedAt,
        },
      });
    } catch (greska) {
      console.error("oceni:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /**
   * Poslednjih pet komentara svih klijenata za jedan proizvod, i - ako je
   * pozivalac klijent - njegova sopstvena ocena.
   *
   * Sopstvena ocena se salje odvojeno da bi strana mogla da popuni obrazac
   * onim sto je klijent vec ostavio, i da bi mogla da uokviri bas njegove
   * komentare, kako trazi tekst zadatka.
   */
  komentari = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.id);

      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ message: "Neispravan identifikator proizvoda." });
        return;
      }

      const komentari = await Rating.aggregate([
        // Ocena bez teksta se ne prikazuje kao komentar - ona je samo lajk.
        { $match: { productId: new Types.ObjectId(productId), comment: { $ne: "" } } },
        { $sort: { updatedAt: -1 } },
        { $limit: BROJ_KOMENTARA },
        {
          $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "autor" },
        },
        { $unwind: { path: "$autor", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            userId: 1,
            value: 1,
            comment: 1,
            // Tekst zadatka trazi bas ovo troje: korisnicko ime, datum, tekst.
            username: { $ifNull: ["$autor.username", "(obrisan nalog)"] },
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      const [likes, dislikes] = await Promise.all([
        Rating.countDocuments({ productId, value: 1 }),
        Rating.countDocuments({ productId, value: -1 }),
      ]);

      // Sme li pozivalac uopste da oceni ovaj proizvod.
      let mojaOcena = null;
      let smeDaOceni = false;

      if (req.user && (req.user.type === "CLIENT_INDIVIDUAL" || req.user.type === "CLIENT_COMPANY")) {
        mojaOcena = await Rating.findOne({ productId, userId: req.user.id });
        smeDaOceni = !!(await Invoice.exists({
          clientId: req.user.id,
          status: "RECEIVED",
          "items.productId": new Types.ObjectId(productId),
        }));
      }

      res.json({
        comments: komentari,
        likes,
        dislikes,
        myRating: mojaOcena
          ? { value: mojaOcena.value, comment: mojaOcena.comment, updatedAt: mojaOcena.updatedAt }
          : null,
        canRate: smeDaOceni,
      });
    } catch (greska) {
      console.error("komentari:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
