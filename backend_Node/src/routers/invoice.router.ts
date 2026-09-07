import express from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";

const invoiceRouter = express.Router();
const kontroler = new InvoiceController();

const klijent = [autentikacija, dozvoli("CLIENT_INDIVIDUAL", "CLIENT_COMPANY")];
const stampar = [autentikacija, dozvoli("PRINTER")];

// --- klijent ---------------------------------------------------------------
// Kao i kod korpe i profila: nema identifikatora korisnika u putanji, jer se
// uzima iz tokena. "mine" i "printer" moraju stajati PRE ruta sa :id.
invoiceRouter.route("/mine").get(klijent, kontroler.mojeNarudzbine);

// Arhiva proizvoda: pojedinacne stavke faktura u statusima isporuceno i primljeno.
invoiceRouter.route("/archive").get(klijent, kontroler.arhiva);

// --- stampar ---------------------------------------------------------------
invoiceRouter.route("/printer").get(stampar, kontroler.narudzbineStamparije);

// --- prelazi statusa -------------------------------------------------------
// Ko sme koji prelaz vidi se iz same rute: klijent otkazuje i potvrdjuje
// prijem, stampar pomera narudzbinu kroz stampu.
// Plaćanje. Stripe tok ima dva koraka: napravi PaymentIntent, pa ga server
// potvrđuje tek nakon što Stripe.js potvrdi karticu. Sve mora pre rute sa :id.
invoiceRouter.route("/payment-intent").post(klijent, kontroler.zapocniStripePlacanje);
invoiceRouter.route("/pay/confirm").post(klijent, kontroler.potvrdiStripePlacanje);
invoiceRouter.route("/pay").post(klijent, kontroler.plati);

// PDF fakture - vidi je i klijent i stamparija, uslov je u samom upitu.
invoiceRouter.route("/:id/pdf").get(autentikacija, kontroler.pdf);

invoiceRouter.route("/:id/cancel").patch(klijent, kontroler.otkazi);
invoiceRouter.route("/:id/received").patch(klijent, kontroler.potvrdiPrijem);
invoiceRouter.route("/:id/advance").patch(stampar, kontroler.pomeriStatus);

export default invoiceRouter;
