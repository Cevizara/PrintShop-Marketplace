import { Injectable } from '@angular/core';

/**
 * Rad sa kolacicima.
 *
 * Tekst zadatka izricito trazi da izabrana slika iz galerije proizvoda
 * "postaje zapamcena u kolacicu tog veb pregledaca" - zato bas kolacic, a ne
 * localStorage, koji koristimo za token i prijavljenog korisnika.
 */
@Injectable({ providedIn: 'root' })
export class CookieService {
  postavi(ime: string, vrednost: string, dana = 30): void {
    const istice = new Date(Date.now() + dana * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie =
      encodeURIComponent(ime) + '=' + encodeURIComponent(vrednost) +
      '; expires=' + istice + '; path=/';
  }

  uzmi(ime: string): string | null {
    const trazeni = encodeURIComponent(ime) + '=';

    for (const deo of document.cookie.split(';')) {
      const ociscen = deo.trim();
      if (ociscen.startsWith(trazeni)) {
        return decodeURIComponent(ociscen.substring(trazeni.length));
      }
    }

    return null;
  }

  /** Glavna slika koju je korisnik izabrao za odredjeni proizvod. */
  zapamtiSliku(idProizvoda: string, slika: string): void {
    this.postavi('ph_galerija_' + idProizvoda, slika);
  }

  zapamcenaSlika(idProizvoda: string): string | null {
    return this.uzmi('ph_galerija_' + idProizvoda);
  }
}
