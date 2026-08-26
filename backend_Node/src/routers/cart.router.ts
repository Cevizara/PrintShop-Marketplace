import express from "express";
import { CartController } from "../controllers/cart.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";
import { otpremiSlikuZaStampu } from "../middleware/upload.middleware";

const cartRouter = express.Router();
const kontroler = new CartController();

// Korpa postoji samo za klijente. Stampar i administrator nemaju sta da naruce.
const KLIJENTI = ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"] as const;
const klijent = [autentikacija, dozvoli(...KLIJENTI)];

// Korpa se, kao i profil, ne adresira identifikatorom: uvek je to korpa onoga
// ko drzi token. Da je ovde stajalo /cart/:id, morala bi da postoji provera
// da korpa pripada pozivaocu - a takva provera se lako zaboravi.
cartRouter.route("/").get(klijent, kontroler.korpa).delete(klijent, kontroler.isprazni);

// Dodavanje nosi slicicu za stampu, pa ide kao multipart/form-data.
cartRouter
  .route("/items")
  .post(klijent, otpremiSlikuZaStampu.single("printImage"), kontroler.dodaj);

// Dugme POTVRDI. Mora stajati PRE /items/:id, inace bi "checkout" bilo
// protumaceno kao identifikator stavke.
cartRouter.route("/checkout").post(klijent, kontroler.zatvoriNarudzbinu);

cartRouter
  .route("/items/:id")
  .patch(klijent, kontroler.promeniKolicinu)
  .delete(klijent, kontroler.izbaci);

export default cartRouter;
