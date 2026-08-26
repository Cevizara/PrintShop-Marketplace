import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserType } from "../models/User";

/**
 * Sadrzaj tokena. Namerno je mali: samo ono sto je potrebno da server zna ko
 * zove endpoint. Sve ostalo se cita iz baze.
 * U token NIKADA ne ide nista tajno - sadrzaj tokena svako moze da procita,
 * potpis samo sprecava da ga neko IZMENI.
 */
export interface SadrzajTokena {
  id: string;
  username: string;
  type: UserType;
}

/** Prosirujemo Express zahtev, da kontroleri mogu da citaju req.user. */
declare global {
  namespace Express {
    interface Request {
      user?: SadrzajTokena;
    }
  }
}

export function napraviToken(sadrzaj: SadrzajTokena): string {
  return jwt.sign(sadrzaj, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Provera IDENTITETA: ko je poslao zahtev.
 *
 * Token stize u zaglavlju  Authorization: Bearer <token>  i proverava se
 * tajnim kljucem servera. Ako je klijent menjao sadrzaj tokena (npr. upisao
 * type: "ADMIN"), potpis vise ne odgovara i zahtev se odbija.
 */
export function autentikacija(req: Request, res: Response, next: NextFunction): void {
  const zaglavlje = req.headers.authorization;

  if (!zaglavlje || !zaglavlje.startsWith("Bearer ")) {
    res.status(401).json({ message: "Niste prijavljeni." });
    return;
  }

  try {
    req.user = jwt.verify(zaglavlje.substring(7), env.jwtSecret) as SadrzajTokena;
    next();
  } catch {
    res.status(401).json({ message: "Sesija je istekla. Prijavite se ponovo." });
  }
}

/**
 * Provera PRAVA: sme li bas ovaj korisnik da uradi ovo.
 * Uvek se stavlja posle autentikacije:
 *
 *   router.post("/obradi", autentikacija, dozvoli("ADMIN"), kontroler.obradi)
 *
 * Ovo je prava zastita. Angular guard samo sakriva dugmad - endpoint se i
 * dalje moze pozvati iz Postman-a.
 */
export function dozvoli(...dozvoljeniTipovi: UserType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Niste prijavljeni." });
      return;
    }

    if (!dozvoljeniTipovi.includes(req.user.type)) {
      res.status(403).json({ message: "Nemate pravo pristupa ovoj funkcionalnosti." });
      return;
    }

    next();
  };
}
