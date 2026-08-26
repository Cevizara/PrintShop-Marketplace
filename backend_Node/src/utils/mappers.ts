import { IProduct } from "../models/Product";
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

/** Podaci o stampariji koji se prikazuju uz proizvod. */
interface Stampar {
  _id?: unknown;
  institution?: { name?: string; city?: string; address?: string; lat?: number; lng?: number };
}

/**
 * Proizvod sa SVIM podacima - cena, opis, boje, usluge stampe.
 *
 * Ovo vidi prijavljen klijent. Neregistrovani posetilac ide kroz posebnu,
 * skracenu putanju u PublicController: tekst zadatka te podatke naziva
 * "prosirenim informacijama" i daje ih tek prijavljenom korisniku, pa ih
 * server na javnoj ruti uopste ne salje - umesto da racunamo na to da ih
 * strana sakrije.
 */
export function pungProizvod(proizvod: IProduct) {
  const stampar = proizvod.printerId as unknown as Stampar;

  return {
    _id: proizvod._id,
    code: proizvod.code,
    name: proizvod.name,
    description: proizvod.description,
    categoryName: proizvod.categoryName,
    subcategoryName: proizvod.subcategoryName,
    unitPrice: proizvod.unitPrice,
    stock: proizvod.stock,
    availableColors: proizvod.availableColors,
    mainImage: proizvod.mainImage,
    additionalImages: proizvod.additionalImages,
    printServices: proizvod.printServices,

    // Stampar je ovde "spljosten" u nekoliko polja umesto da se salje ceo
    // korisnik: strani sa detaljima trebaju naziv, grad, adresa i koordinate
    // za mapu, a nista od ostalog (mejl, telefon, PIB) tu nema sta da trazi.
    printerId: stampar?._id ?? proizvod.printerId,
    printerName: stampar?.institution?.name ?? "",
    printerCity: stampar?.institution?.city ?? "",
    printerAddress: stampar?.institution?.address ?? "",
    printerLat: stampar?.institution?.lat,
    printerLng: stampar?.institution?.lng,
  };
}
