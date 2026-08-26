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

  /**
   * Poruka koju strana za prijavu treba da prikaže kada tamo stignete zato što
   * je nešto isteklo, a ne zato što ste sami kliknuli „Prijava".
   *
   * Server na istekao token već vraća objašnjenje, ali interceptor je do sada
   * odbacivao i samo preusmeravao — korisnik bi se odjednom našao na prijavi bez
   * ijedne reči o tome zašto. Ovde se poruka prenese do strane koja je prikaže.
   *
   * Signal, a ne parametar u adresi: poruka ne treba da ostane u istoriji
   * pregledača niti da se vidi ako se link kopira.
   */
  readonly porukaSesije = signal('');

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

  /**
   * Osvežava zapamćenog korisnika posle izmene profila.
   * Token se NE dira - u njemu su samo identifikator, korisničko ime i tip, a
   * nijedno od toga se izmenom profila ne menja.
   */
  osveziKorisnika(korisnik: Korisnik): void {
    localStorage.setItem(KLJUC_KORISNIKA, JSON.stringify(korisnik));
    this.korisnik.set(korisnik);
  }

  /**
   * Odjava briše token i zapamćenog korisnika IZ PREGLEDAČA.
   *
   * Vredi znati šta odjava NIJE: sam token na serveru i dalje važi do isteka.
   * Server ne pamti ko je prijavljen — proverava samo potpis — pa nema šta da
   * poništi. Odjava je „zaboravi propusnicu", ne „ukini propusnicu".
   *
   * Prava revokacija bi tražila spisak poništenih tokena na serveru, čime bi se
   * vratilo stanje koje JWT baš izbegava. Za ovu aplikaciju se ne isplati, ali
   * je posledica koju svesno prihvatamo, a ne previd.
   */
  odjava(): void {
    localStorage.removeItem(KLJUC_TOKENA);
    localStorage.removeItem(KLJUC_KORISNIKA);
    this.korisnik.set(null);
    this.porukaSesije.set('');
    this.router.navigate(['/']);
  }

  /**
   * Gde korisnik ide posle uspešne prijave, prema svom tipu.
   * Svaka uloga se otvara na strani koja joj je posao, a ne na javnoj početnoj.
   */
  pocetnaRutaZa(tip: TipKorisnika): string {
    switch (tip) {
      case 'ADMIN':
        return '/admin/zahtevi';
      case 'PRINTER':
        return '/stampar/proizvodi';
      case 'CLIENT_INDIVIDUAL':
      case 'CLIENT_COMPANY':
        return '/klijent/pretraga';
      default:
        return '/';
    }
  }
}
