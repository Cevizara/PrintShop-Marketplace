import express from "express";
import { UserController } from "../controllers/user.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";
import { otpremiProfilnuSliku } from "../middleware/upload.middleware";

const userRouter = express.Router();
const kontroler = new UserController();

// Sve rute ovde traze prijavu. Skrivanje stavke iz Angular menija nije zastita
// - endpoint se moze pozvati i mimo aplikacije.

// --- profil: svaki prijavljen korisnik nad SVOJIM nalogom ------------------
// Nema identifikatora u putanji: "me" je uvek onaj ko drzi token. Da je ovde
// stajalo /users/:id, morala bi da postoji provera da id pripada pozivaocu -
// a takva provera se lako zaboravi.
userRouter
  .route("/me")
  .get(autentikacija, kontroler.mojProfil)
  .put(autentikacija, kontroler.azurirajProfil);

userRouter
  .route("/me/image")
  .post(
    autentikacija,
    otpremiProfilnuSliku.single("profileImage"),
    kontroler.promeniProfilnuSliku
  );

// --- zahtevi za registraciju: samo administrator ---------------------------
userRouter
  .route("/requests")
  .get(autentikacija, dozvoli("ADMIN"), kontroler.zahteviZaRegistraciju);

userRouter
  .route("/requests/resolve")
  .post(autentikacija, dozvoli("ADMIN"), kontroler.obradiZahtev);

// --- upravljanje nalozima: samo administrator ------------------------------
userRouter.route("/").get(autentikacija, dozvoli("ADMIN"), kontroler.sviKorisnici);

// Mora stajati POSLE /me i /requests, inace bi "me" bilo protumaceno kao
// identifikator korisnika.
userRouter
  .route("/:id")
  .put(autentikacija, dozvoli("ADMIN"), kontroler.azurirajKorisnika)
  .delete(autentikacija, dozvoli("ADMIN"), kontroler.obrisiKorisnika);

export default userRouter;
