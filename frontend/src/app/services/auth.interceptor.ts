import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Uz svaki zahtev dodaje JWT token, u zaglavlje Authorization: Bearer <token>.
 * Napisano jednom - vazi za sve pozive, pa nijedan servis ne mora da misli o tome.
 *
 * Ako server vrati 401 (token istekao ili je menjan), sesija se brise i
 * korisnik se vraca na formu za prijavu - ali sa OBJASNJENJEM.
 */
export const authInterceptor: HttpInterceptorFn = (zahtev, dalje) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const token = localStorage.getItem('ph_token');

  const saTokenom = token
    ? zahtev.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : zahtev;

  return dalje(saTokenom).pipe(
    catchError((greska: HttpErrorResponse) => {
      if (greska.status === 401) {
        /*
         * Poruka se prenosi na stranu za prijavu.
         *
         * Do sada je ovde stajalo samo brisanje i preusmerenje, pa bi se
         * korisnik odjednom nasao na prijavi bez ijedne reci o tome zasto -
         * a server objasnjenje SALJE, samo se odbacivalo na ovom mestu.
         *
         * Poruka se postavlja samo ako je token POSTOJAO: 401 na poziv koji je
         * krenuo bez tokena znaci "niste prijavljeni", a ne "sesija je istekla".
         */
        if (token) {
          auth.porukaSesije.set(
            greska.error?.message ?? 'Sesija je istekla. Prijavite se ponovo.'
          );
        }

        localStorage.removeItem('ph_token');
        localStorage.removeItem('ph_korisnik');
        auth.korisnik.set(null);

        router.navigate(['/prijava']);
      }

      return throwError(() => greska);
    })
  );
};
