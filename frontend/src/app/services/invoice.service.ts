import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Narudzbina, OdgovorKomentara, StavkaArhive, StatusNarudzbine } from '../models/models';
import { API } from './api';

/** Po čemu tabela narudžbina sme da se sortira — isti spisak kao na serveru. */
export type PoljeSortiranja = 'number' | 'total' | 'status' | 'date' | 'printer' | 'city';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);

  // --- klijent --------------------------------------------------------------

  mojeNarudzbine(sort: PoljeSortiranja = 'date', dir: 'asc' | 'desc' = 'desc') {
    const parametri = new URLSearchParams({ sort, dir });
    return this.http.get<Narudzbina[]>(`${API}/invoices/mine?${parametri}`);
  }

  otkazi(id: string) {
    return this.http.patch<{ message: string; invoice: Narudzbina }>(
      `${API}/invoices/${id}/cancel`,
      {}
    );
  }

  potvrdiPrijem(id: string) {
    return this.http.patch<{ message: string; invoice: Narudzbina }>(
      `${API}/invoices/${id}/received`,
      {}
    );
  }

  /** Arhiva proizvoda: pojedinačne stavke isporučenih i primljenih faktura. */
  arhiva(sort: 'date' | 'name' | 'quantity' | 'printer' = 'date', dir: 'asc' | 'desc' = 'desc') {
    const parametri = new URLSearchParams({ sort, dir });
    return this.http.get<StavkaArhive[]>(`${API}/invoices/archive?${parametri}`);
  }

  /**
   * Plaćanje jedne ili više faktura jednom karticom.
   *
   * Broj kartice i CVC putuju samo do servera i tamo se ne upisuju u bazu —
   * ostaju tip kartice i poslednje četiri cifre. Vidi utils/placanje.ts.
   */
  plati(invoiceIds: string[], cardNumber: string, cvc: string, expiry: string) {
    return this.http.post<{
      message: string;
      paid: { _id: string; number: string; total: number }[];
      total: number;
      brand: string;
      last4: string;
      reference: string;
    }>(`${API}/invoices/pay`, { invoiceIds, cardNumber, cvc, expiry });
  }

  zapocniPlacanje(invoiceIds: string[]) {
    return this.http.post<
      | { mode: 'local' }
      | { mode: 'stripe'; clientSecret: string; publishableKey: string; currency: string }
    >(`${API}/invoices/payment-intent`, { invoiceIds });
  }

  potvrdiStripePlacanje(invoiceIds: string[], paymentIntentId: string) {
    return this.http.post<{
      message: string;
      paid: { _id: string; number: string; total: number }[];
      total: number;
      brand: string;
      last4: string;
      reference: string;
      engine: 'stripe';
    }>(`${API}/invoices/pay/confirm`, { invoiceIds, paymentIntentId });
  }

  /**
   * PDF fakture, kao blob.
   *
   * Ne kao obična adresa u `<a href>`: takav zahtev ne prolazi kroz interceptor
   * koji postavlja zaglavlje Authorization, pa bi token morao u sam URL — a
   * tamo završava u istoriji pregledača i u zapisima servera. Ovako zahtev ide
   * kroz HttpClient, sa zaglavljem kao i svaki drugi.
   */
  pdf(id: string) {
    return this.http.get(`${API}/invoices/${id}/pdf`, { responseType: 'blob' });
  }

  // --- ocene i komentari ----------------------------------------------------

  komentari(productId: string) {
    return this.http.get<OdgovorKomentara>(`${API}/ratings/product/${productId}`);
  }

  oceni(productId: string, value: 1 | -1, comment: string) {
    return this.http.post<{ message: string }>(`${API}/ratings`, { productId, value, comment });
  }

  // --- štampar --------------------------------------------------------------

  narudzbineStamparije(
    status: StatusNarudzbine | '' = '',
    sort: PoljeSortiranja = 'date',
    dir: 'asc' | 'desc' = 'desc'
  ) {
    const parametri = new URLSearchParams({ status, sort, dir });
    return this.http.get<Narudzbina[]>(`${API}/invoices/printer?${parametri}`);
  }

  /**
   * Pomera status za jedan korak unapred. Koji je to korak odlučuje server —
   * klijentu se ne dozvoljava da pošalje status i time preskoči korak.
   */
  pomeriStatus(id: string) {
    return this.http.patch<{ message: string; invoice: Narudzbina }>(
      `${API}/invoices/${id}/advance`,
      {}
    );
  }
}
