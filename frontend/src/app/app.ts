import { Component, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';

/**
 * Okvir aplikacije.
 *
 * Tekst zadatka trazi da svaka veb strana ima meni, zaglavlje i podnozje, kao
 * i link za odjavu. Zato su ovde, u komponenti koja obavija sve rute, a ne u
 * svakoj strani posebno.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  auth = inject(AuthService);
  korpa = inject(CartService);

  constructor() {
    /**
     * Broj stavki u korpi se ucitava kada se prijavi klijent, i nulira kada se
     * odjavi. Effect prati signal prijavljenog korisnika, pa se to desava samo
     * ako se korisnik zaista promeni - a ne pri svakoj promeni rute.
     */
    effect(() => {
      const korisnik = this.auth.korisnik();

      if (korisnik && (korisnik.type === 'CLIENT_INDIVIDUAL' || korisnik.type === 'CLIENT_COMPANY')) {
        this.korpa.ucitajBroj();
      } else {
        this.korpa.brojStavki.set(0);
      }
    });
  }

  get godina(): number {
    return new Date().getFullYear();
  }

  odjava(): void {
    this.auth.odjava();
  }
}
