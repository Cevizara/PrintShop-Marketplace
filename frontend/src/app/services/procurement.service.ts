import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IzvestajNabavke, MojaPonuda, Nabavka, Ponuda } from '../models/models';
import { API } from './api';

/** Jedan red ponude koji štampar šalje: koji njegov proizvod, i po kojoj ceni. */
export interface RedZaSlanje {
  itemId: string;
  productId: string;
  unitPrice: number;
}

@Injectable({ providedIn: 'root' })
export class ProcurementService {
  private http = inject(HttpClient);

  // --- ustanova (klijent — pravno lice) -------------------------------------

  /**
   * Nabavke koje je raspisala prijavljena ustanova.
   * Server pri svakom čitanju zaključi one kojima je rok istekao — tako traži
   * fusnota 6 teksta zadatka, bez tajmera i pozadinskog posla.
   */
  moje() {
    return this.http.get<Nabavka[]>(`${API}/procurements/mine`);
  }

  izvestaj(id: string) {
    return this.http.get<IzvestajNabavke>(`${API}/procurements/${id}/report`);
  }

  /** PDF izveštaj o licitaciji, kao blob. Isti razlog kao kod fakture. */
  izvestajPdf(id: string) {
    return this.http.get(`${API}/procurements/${id}/report.pdf`, { responseType: 'blob' });
  }

  // --- štampar --------------------------------------------------------------

  otvorene() {
    return this.http.get<Nabavka[]>(`${API}/procurements/open`);
  }

  posaljiPonudu(id: string, lines: RedZaSlanje[]) {
    return this.http.post<{ message: string; bid: Ponuda }>(
      `${API}/procurements/${id}/bids`,
      { lines }
    );
  }

  mojePonude() {
    return this.http.get<MojaPonuda[]>(`${API}/procurements/my-bids`);
  }
}
