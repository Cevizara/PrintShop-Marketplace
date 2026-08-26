import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Korisnik, OdgovorPrijave, OdgovorResetLinka, TipKorisnika } from '../models/models';
import { API } from './api';

const KLJUC_TOKENA = 'ph_token';
const KLJUC_KORISNIKA = 'ph_korisnik';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /**
   * Prijavljeni korisnik, cuvan u localStorage da prezivi osvezavanje strane.
   *
   * VAZNO: ovo sluzi SAMO prikazu - koji meni prikazati, cije ime ispisati.
   * Prava se proveravaju na serveru, preko potpisanog JWT tokena. Izmena ovog
   * objekta kroz alatke pregledaca ne daje nikakve privilegije.
   */
  readonly korisnik = signal<Korisnik | null>(this.procitajKorisnika());

  private procitajKorisnika(): Korisnik | null {
    const zapis = localStorage.getItem(KLJUC_KORISNIKA);
    if (!zapis) return null;
    try {
      return JSON.parse(zapis) as Korisnik;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return localStorage.getItem(KLJUC_TOKENA);
  }

  get prijavljen(): boolean {
    return !!this.token && !!this.korisnik();
  }

  jeTipa(...tipovi: TipKorisnika[]): boolean {
    const k = this.korisnik();
    return !!k && tipovi.includes(k.type);
  }

  // --- pozivi ka serveru ---------------------------------------------------

  prijava(username: string, password: string) {
    return this.http.post<OdgovorPrijave>(`${API}/auth/login`, { username, password });
  }

  prijavaAdministratora(username: string, password: string) {
    return this.http.post<OdgovorPrijave>(`${API}/auth/admin/login`, { username, password });
  }

  /** Registracija ide kao FormData jer nosi i profilnu sliku. */
  registracija(podaci: FormData) {
    return this.http.post<{ message: string }>(`${API}/auth/register`, podaci);
  }

  zatraziLinkZaLozinku(identifier: string) {
    return this.http.post<OdgovorResetLinka>(`${API}/auth/forgot-password`, { identifier });
  }

  proveriLink(token: string) {
    return this.http.get<{ valid: boolean; message?: string }>(`${API}/auth/reset-token/${token}`);
  }

  postaviNovuLozinku(token: string, password: string) {
    return this.http.post<{ message: string }>(`${API}/auth/reset-password`, { token, password });
  }

  // --- sesija --------------------------------------------------------------

  zapamtiSesiju(odgovor: OdgovorPrijave): void {
    localStorage.setItem(KLJUC_TOKENA, odgovor.token);
    localStorage.setItem(KLJUC_KORISNIKA, JSON.stringify(odgovor.user));
    this.korisnik.set(odgovor.user);
  }

  odjava(): void {
    localStorage.removeItem(KLJUC_TOKENA);
    localStorage.removeItem(KLJUC_KORISNIKA);
    this.korisnik.set(null);
    this.router.navigate(['/']);
  }

  /** Gde korisnik ide posle uspesne prijave, prema svom tipu. */
  pocetnaRutaZa(tip: TipKorisnika): string {
    return tip === 'ADMIN' ? '/admin/zahtevi' : '/';
  }
}
