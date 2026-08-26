import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TipKorisnika } from '../models/models';
import { AuthService } from './auth.service';

/**
 * Sprecava da neprijavljen korisnik ili korisnik pogresnog tipa otvori stranu.
 *
 * VAZNO: ovo je samo udobnost za korisnika, NE zastita. Svako moze da pozove
 * serverski endpoint mimo Angulara. Prava zastita je dozvoli() middleware na
 * serveru, koji stoji na svakoj zasticenoj ruti.
 */
export function rolaGuard(...dozvoljeniTipovi: TipKorisnika[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.prijavljen) {
      router.navigate(['/pristup']);
      return false;
    }

    if (dozvoljeniTipovi.length && !auth.jeTipa(...dozvoljeniTipovi)) {
      router.navigate(['/']);
      return false;
    }

    return true;
  };
}
