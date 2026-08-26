import express from "express";
import { ProductController } from "../controllers/product.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";
import { otpremiJsonFajl, otpremiSlikuProizvoda } from "../middleware/upload.middleware";

const productRouter = express.Router();
const kontroler = new ProductController();

/**
 * Glavna slika i galerija stizu u istom zahtevu, pod razlicitim imenima polja.
 * Zato .fields(...), a ne .single(...) ili .array(...).
 */
const slikeProizvoda = otpremiSlikuProizvoda.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "additionalImages", maxCount: 3 },
]);

const KLIJENTI = ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"] as const;

// --- stampar ---------------------------------------------------------------
productRouter
  .route("/mine")
  .get(autentikacija, dozvoli("PRINTER"), kontroler.mojiProizvodi);

productRouter
  .route("/")
  .post(autentikacija, dozvoli("PRINTER"), slikeProizvoda, kontroler.dodajProizvod);

// Uvoz lager liste iz JSON fajla (Prilog 1).
productRouter
  .route("/import")
  .post(autentikacija, dozvoli("PRINTER"), otpremiJsonFajl.single("file"), kontroler.uveziIzFajla);

// --- klijent ---------------------------------------------------------------
// Prosirena pretraga i detalji: cena, opis, boje i usluge stampe.
productRouter
  .route("/search")
  .get(autentikacija, dozvoli(...KLIJENTI), kontroler.pretraga);

// --- rute sa identifikatorom ----------------------------------------------
// MORAJU stajati posle /mine, /import i /search, inace bi Express te reci
// protumacio kao identifikator proizvoda.
productRouter
  .route("/:id/stock")
  .patch(autentikacija, dozvoli("PRINTER"), kontroler.azurirajZalihe);

productRouter
  .route("/:id/images")
  .post(autentikacija, dozvoli("PRINTER"), slikeProizvoda, kontroler.dodajSlike);

productRouter
  .route("/:id")
  .get(autentikacija, dozvoli(...KLIJENTI), kontroler.detalji);

export default productRouter;
