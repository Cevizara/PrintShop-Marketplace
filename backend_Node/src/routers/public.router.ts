import express from "express";
import { PublicController } from "../controllers/public.controller";

const publicRouter = express.Router();
const kontroler = new PublicController();

// Sve rute u ovom ruteru su dostupne i neprijavljenom posetiocu.
publicRouter.route("/home").get(kontroler.pocetna);
publicRouter.route("/categories").get(kontroler.kategorijeSaZalihama);
publicRouter.route("/products/search").get(kontroler.pretraga);

// Mora stajati POSLE /products/search, inace bi "search" bio protumacen
// kao identifikator proizvoda.
publicRouter.route("/products/:id").get(kontroler.detaljiProizvoda);

export default publicRouter;
