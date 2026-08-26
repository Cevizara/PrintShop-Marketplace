import { IUser } from "../models/User";

/**
 * Korisnik u obliku u kojem sme da napusti server.
 *
 * Kljucno: NEMA polja password. Sva mesta koja vracaju korisnika idu kroz ovu
 * funkciju, pa hes lozinke ne moze da procuri kroz neki novi endpoint koji
 * neko doda kasnije.
 */
export function javniKorisnik(korisnik: IUser) {
  return {
    _id: korisnik._id,
    username: korisnik.username,
    firstName: korisnik.firstName,
    lastName: korisnik.lastName,
    phone: korisnik.phone,
    email: korisnik.email,
    profileImage: korisnik.profileImage,
    type: korisnik.type,
    status: korisnik.status,
    institution: korisnik.institution,
    createdAt: korisnik.createdAt,
  };
}
