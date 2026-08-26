import express from "express";
import { RatingController } from "../controllers/rating.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";

const ratingRouter = express.Router();
const kontroler = new RatingController();

// Ocenjuje samo klijent, i to samo proizvod koji je primio - sama provera
// "primljen" je u kontroleru, jer trazi pogled u fakture.
ratingRouter
  .route("/")
  .post(autentikacija, dozvoli("CLIENT_INDIVIDUAL", "CLIENT_COMPANY"), kontroler.oceni);

// Komentare vidi svaki prijavljen korisnik. Nisu javni: tekst zadatka ih
// pominje uz PROSIRENE informacije o proizvodu, koje vidi tek prijavljeni.
ratingRouter.route("/product/:id").get(autentikacija, kontroler.komentari);

export default ratingRouter;
