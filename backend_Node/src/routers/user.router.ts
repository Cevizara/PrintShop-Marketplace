import express from "express";
import { UserController } from "../controllers/user.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";

const userRouter = express.Router();
const kontroler = new UserController();

// Obe rute prolaze kroz proveru identiteta i prava NA SERVERU.
// Skrivanje stavke iz Angular menija nije zastita - endpoint se moze pozvati
// i mimo aplikacije.
userRouter
  .route("/requests")
  .get(autentikacija, dozvoli("ADMIN"), kontroler.zahteviZaRegistraciju);

userRouter
  .route("/requests/resolve")
  .post(autentikacija, dozvoli("ADMIN"), kontroler.obradiZahtev);

export default userRouter;
