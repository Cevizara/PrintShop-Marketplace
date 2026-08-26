import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Uz svaki zahtev dodaje JWT token, u zaglavlje Authorization: Bearer <token>.
 * Napisano jednom - vazi za sve pozive, pa nijedan servis ne mora da misli o tome.
 *
 * Ako server vrati 401 (token istekao ili je menjan), sesija se brise i
 * korisnik se vraca na formu za prijavu.
 */
export const authInterceptor: HttpInterceptorFn = (zahtev, dalje) => {
  const router = inject(Router);
  const token = localStorage.getItem('ph_token');

  const saTokenom = token
    ? zahtev.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : zahtev;

  return dalje(saTokenom).pipe(
    catchError((greska: HttpErrorResponse) => {
      if (greska.status === 401) {
        localStorage.removeItem('ph_token');
        localStorage.removeItem('ph_korisnik');
        router.navigate(['/pristup']);
      }
      return throwError(() => greska);
    })
  );
};
