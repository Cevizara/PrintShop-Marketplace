import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { otpremiProfilnuSliku } from "../middleware/upload.middleware";

const authRouter = express.Router();
const kontroler = new AuthController();

// Registracija nosi profilnu sliku, pa ide kao multipart/form-data.
// Ime polja "profileImage" mora se poklopiti sa onim sto salje forma.
authRouter
  .route("/register")
  .post(otpremiProfilnuSliku.single("profileImage"), kontroler.registracija);

// Javno vidljiva forma - klijenti i stampari.
authRouter.route("/login").post(kontroler.prijava);

// Prijava administratora. Posebna ruta koja se nigde ne pominje na javnom
// delu sajta, i koja prihvata iskljucivo naloge tipa ADMIN.
authRouter.route("/admin/login").post(kontroler.prijavaAdministratora);

// Zaboravljena lozinka: zahtev za link, provera linka, postavljanje lozinke.
authRouter.route("/forgot-password").post(kontroler.zaboravljenaLozinka);
authRouter.route("/reset-token/:token").get(kontroler.proveriToken);
authRouter.route("/reset-password").post(kontroler.postaviNovuLozinku);

export default authRouter;
