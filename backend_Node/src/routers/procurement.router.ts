import express from "express";
import { ProcurementController } from "../controllers/procurement.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";

const procurementRouter = express.Router();
const kontroler = new ProcurementController();

// Javne nabavke raspisuje iskljucivo klijent - PRAVNO LICE. Fizicko lice iz
// korpe dobija fakture, i to je cela razlika izmedju ta dva tipa klijenta.
const ustanova = [autentikacija, dozvoli("CLIENT_COMPANY")];
const stampar = [autentikacija, dozvoli("PRINTER")];

// --- ustanova --------------------------------------------------------------
procurementRouter.route("/mine").get(ustanova, kontroler.moje);

// --- stampar ---------------------------------------------------------------
// Moraju stajati PRE ruta sa :id.
procurementRouter.route("/open").get(stampar, kontroler.otvorene);
procurementRouter.route("/my-bids").get(stampar, kontroler.mojePonude);

// --- rute sa identifikatorom ----------------------------------------------
procurementRouter.route("/:id/report").get(ustanova, kontroler.izvestaj);
// PDF izvestaj koji tekst zadatka trazi - pravi se tek kada je licitacija gotova.
procurementRouter.route("/:id/report.pdf").get(ustanova, kontroler.izvestajPdf);
procurementRouter.route("/:id/bids").post(stampar, kontroler.posaljiPonudu);

export default procurementRouter;
