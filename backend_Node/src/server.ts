import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import { connectToDatabase } from "./config/database";
import { env } from "./config/env";
import { KOREN_OTPREME, pripremiFoldere } from "./middleware/upload.middleware";
import authRouter from "./routers/auth.router";
import cartRouter from "./routers/cart.router";
import categoryRouter from "./routers/category.router";
import invoiceRouter from "./routers/invoice.router";
import procurementRouter from "./routers/procurement.router";
import productRouter from "./routers/product.router";
import publicRouter from "./routers/public.router";
import ratingRouter from "./routers/rating.router";
import statsRouter from "./routers/stats.router";
import userRouter from "./routers/user.router";

const app = express();

app.use(cors());
app.use(express.json());

// Otpremljene slike se serviraju staticki:
//   /uploads/profile/...  /uploads/product/...  /uploads/default_profile_image.jpg
pripremiFoldere();
app.use("/uploads", express.static(KOREN_OTPREME));

const router = express.Router();
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/cart", cartRouter);
router.use("/invoices", invoiceRouter);
router.use("/procurements", procurementRouter);
router.use("/products", productRouter);
router.use("/public", publicRouter);
router.use("/ratings", ratingRouter);
router.use("/stats", statsRouter);

app.use("/", router);

/**
 * Centralna obrada gresaka.
 *
 * Bez ovoga bi greske iz multera (pogresan format fajla, prevelik fajl) stigle
 * do klijenta kao HTML strana sa stack trace-om, umesto kao razumljiva poruka.
 * Mora imati sva cetiri parametra - po tome Express prepoznaje da je ovo
 * obradjivac gresaka, a ne obican middleware.
 */
app.use((greska: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (greska instanceof multer.MulterError) {
    res.status(400).json({
      message:
        greska.code === "LIMIT_FILE_SIZE"
          ? "Fajl je prevelik. Najveća dozvoljena veličina je 5 MB."
          : "Greška pri otpremanju fajla: " + greska.message,
    });
    return;
  }

  console.error("Neobrađena greška:", greska);
  res.status(500).json({ message: greska.message || "Greška na serveru." });
});

connectToDatabase()
  .then(() => {
    app.listen(env.port, () => console.log("Express radi na portu " + env.port));
  })
  .catch((greska) => {
    console.error("Povezivanje na bazu nije uspelo.", greska);
    console.error("Proverite da li MongoDB radi, i da li ste pokrenuli: npm run seed");
    process.exit(1);
  });
