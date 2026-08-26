import express from "express";
import { CategoryController } from "../controllers/category.controller";
import { autentikacija, dozvoli } from "../middleware/auth.middleware";

const categoryRouter = express.Router();
const kontroler = new CategoryController();

// Pun spisak kategorija sa potkategorijama treba i stamparu (da svrsta novi
// proizvod) i administratoru - zato je dovoljna prijava, bez odredjenog tipa.
categoryRouter.route("/").get(autentikacija, kontroler.sve);

// Spisak sa brojem proizvoda po kategoriji - vidi ga samo administrator.
categoryRouter.route("/overview").get(autentikacija, dozvoli("ADMIN"), kontroler.saBrojem);

// Dodavanje kategorije i potkategorije: iskljucivo administrator.
categoryRouter.route("/").post(autentikacija, dozvoli("ADMIN"), kontroler.dodajKategoriju);

categoryRouter
  .route("/:id/subcategories")
  .post(autentikacija, dozvoli("ADMIN"), kontroler.dodajPotkategoriju);

export default categoryRouter;
