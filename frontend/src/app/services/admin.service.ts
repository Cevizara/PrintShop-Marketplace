import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Kategorija,
  KretanjeOcene,
  NarucivanProizvod,
  PrometStamparije,
  Korisnik,
  StatusKorisnika,
  TipKorisnika,
} from '../models/models';
import { API } from './api';
import { PodaciProfila } from './user.service';

/** Podaci koje administrator menja na tuđem nalogu - uz status naloga. */
export interface IzmenaNaloga extends PodaciProfila {
  status?: StatusKorisnika;
}

/** Pozivi koje sme da napravi samo administrator. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // --- zahtevi za registraciju ---------------------------------------------

  zahteviZaRegistraciju() {
    return this.http.get<Korisnik[]>(`${API}/users/requests`);
  }

  obradiZahtev(userId: string, approve: boolean) {
    return this.http.post<{ message: string; user: Korisnik }>(
      `${API}/users/requests/resolve`,
      { userId, approve }
    );
  }

  // --- upravljanje nalozima -------------------------------------------------

  korisnici(pojam: string, tip: TipKorisnika | '', status: StatusKorisnika | '') {
    const parametri = new URLSearchParams({ search: pojam, type: tip, status });
    return this.http.get<Korisnik[]>(`${API}/users?${parametri}`);
  }

  izmeniKorisnika(id: string, podaci: IzmenaNaloga) {
    return this.http.put<{ message: string; user: Korisnik }>(`${API}/users/${id}`, podaci);
  }

  obrisiKorisnika(id: string) {
    return this.http.delete<{ message: string; deletedProducts: number }>(`${API}/users/${id}`);
  }

  // --- kategorije -----------------------------------------------------------

  kategorijeSaBrojem() {
    return this.http.get<Kategorija[]>(`${API}/categories/overview`);
  }

  dodajKategoriju(name: string) {
    return this.http.post<{ message: string; category: Kategorija }>(`${API}/categories`, { name });
  }

  dodajPotkategoriju(id: string, name: string) {
    return this.http.post<{ message: string; category: Kategorija }>(
      `${API}/categories/${id}/subcategories`,
      { name }
    );
  }

  // --- statistike -----------------------------------------------------------

  prometStamparija() {
    return this.http.get<PrometStamparije[]>(API + '/stats/printer-revenue');
  }

  narucivaniProizvodi() {
    return this.http.get<NarucivanProizvod[]>(API + '/stats/top-products');
  }

  kretanjeOcena() {
    return this.http.get<KretanjeOcene[]>(`${API}/stats/ratings-over-time`);
  }
}
