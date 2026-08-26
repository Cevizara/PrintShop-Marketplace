import { Request, Response } from "express";
import User from "../models/User";
import { javniKorisnik } from "../utils/mappers";

/**
 * Administratorski deo koji je potreban da bi registracija bila upotrebljiva
 * od kraja do kraja: pregled zahteva i njihovo prihvatanje ili odbacivanje.
 *
 * Ostatak administratorskog dela (upravljanje nalozima, kategorijama,
 * statistike) dolazi u kasnijim tiketima.
 */
export class UserController {
  /**
   * Zahtevi za registraciju - poseban tabelarni pregled svih neodobrenih
   * korisnika, kako trazi tekst zadatka.
   *
   * Upit filtrira po statusu PENDING i koristi indeks idx_status. To je retka
   * vrednost u polju sa svega tri moguce vrednosti - slucaj u kojem indeks
   * najvise dobija.
   */
  zahteviZaRegistraciju = async (_req: Request, res: Response): Promise<void> => {
    try {
      const zahtevi = await User.find({ status: "PENDING" }).sort({ createdAt: 1 });
      res.json(zahtevi.map(javniKorisnik));
    } catch (greska) {
      console.error("zahteviZaRegistraciju:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };

  /** Prihvatanje ili odbacivanje jednog zahteva. */
  obradiZahtev = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, approve } = req.body;

      const korisnik = await User.findById(userId);

      if (!korisnik) {
        res.status(404).json({ message: "Korisnik nije pronađen." });
        return;
      }

      // Sprecava da dva administratora obrade isti zahtev, i da se vec odobren
      // nalog "odobri" jos jednom.
      if (korisnik.status !== "PENDING") {
        res.status(400).json({ message: "Ovaj zahtev je već obrađen." });
        return;
      }

      korisnik.status = approve ? "APPROVED" : "REJECTED";
      await korisnik.save();

      res.json({
        message: approve
          ? `Nalog "${korisnik.username}" je odobren.`
          : `Zahtev korisnika "${korisnik.username}" je odbijen.`,
        user: javniKorisnik(korisnik),
      });
    } catch (greska) {
      console.error("obradiZahtev:", greska);
      res.status(500).json({ message: "Greška na serveru." });
    }
  };
}
