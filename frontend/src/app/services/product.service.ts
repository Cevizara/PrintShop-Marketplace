import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IzvestajUvoza, Proizvod } from '../models/models';
import { API } from './api';

/** Proizvodi: štamparski deo (svoji proizvodi) i klijentski (pretraga). */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  // --- štampar --------------------------------------------------------------

  mojiProizvodi() {
    return this.http.get<Proizvod[]>(`${API}/products/mine`);
  }

  /** Nosi slike, pa ide kao multipart/form-data. */
  dodaj(podaci: FormData) {
    return this.http.post<{ message: string; product: Proizvod }>(`${API}/products`, podaci);
  }

  azurirajZalihe(id: string, stock: number) {
    return this.http.patch<{ message: string; product: Proizvod }>(
      `${API}/products/${id}/stock`,
      { stock }
    );
  }

  dodajSlike(id: string, podaci: FormData) {
    return this.http.post<{ message: string; product: Proizvod }>(
      `${API}/products/${id}/images`,
      podaci
    );
  }

  uvezi(fajl: File) {
    const podaci = new FormData();
    podaci.append('file', fajl);
    return this.http.post<IzvestajUvoza>(`${API}/products/import`, podaci);
  }

  // --- klijent --------------------------------------------------------------

  pretrazi(naziv: string, kategorija: string, smer: 'asc' | 'desc') {
    const parametri = new URLSearchParams({ name: naziv, category: kategorija, sort: smer });
    return this.http.get<Proizvod[]>(`${API}/products/search?${parametri}`);
  }

  detalji(id: string) {
    return this.http.get<Proizvod>(`${API}/products/${id}`);
  }
}
