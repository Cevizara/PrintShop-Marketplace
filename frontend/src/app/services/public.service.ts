import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { JavniDetalji, PodaciPocetne, RezultatPretrage } from '../models/models';
import { API } from './api';

/** Podaci dostupni i neprijavljenom posetiocu. */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private http = inject(HttpClient);

  pocetna() {
    return this.http.get<PodaciPocetne>(`${API}/public/home`);
  }

  kategorije() {
    return this.http.get<string[]>(`${API}/public/categories`);
  }

  pretrazi(naziv: string, kategorija: string, smer: 'asc' | 'desc') {
    const parametri = new URLSearchParams({ name: naziv, category: kategorija, sort: smer });
    return this.http.get<RezultatPretrage[]>(`${API}/public/products/search?${parametri}`);
  }

  detalji(id: string) {
    return this.http.get<JavniDetalji>(`${API}/public/products/${id}`);
  }
}
