import express from "express";
import { StatsController } from "../controllers/stats.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";

const statsRouter = express.Router();
const kontroler = new StatsController();

// Statistike su administratorski deo sistema - nijedna druga uloga ih ne vidi.
const admin = [autentikacija, dozvoli("ADMIN")];

// Tri grafikona koja trazi tekst zadatka.
statsRouter.route("/printer-revenue").get(admin, kontroler.prometStamparija);
statsRouter.route("/top-products").get(admin, kontroler.narucivaniProizvodi);
statsRouter.route("/ratings-over-time").get(admin, kontroler.kretanjeOcena);

export default statsRouter;
