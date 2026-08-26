import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IzdataFaktura, Korpa } from '../models/models';
import { API } from './api';

/**
 * Trenutna elektronska korpa.
 *
 * U putanji nema identifikatora: server korpu nalazi po tokenu. Isto kao kod
 * profila — da klijent ne bi mogao da pošalje tuđi.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);

  /**
   * Broj stavki u korpi, za oznaku u meniju.
   * Signal, da se osveži svuda čim se korpa promeni, bez novog poziva.
   */
  readonly brojStavki = signal(0);

  /** Pamti broj stavki iz svakog odgovora — jedno mesto, da se ne zaboravi. */
  private zapamti(korpa: Korpa): Korpa {
    this.brojStavki.set(korpa.itemCount);
    return korpa;
  }

  korpa() {
    return this.http.get<Korpa>(`${API}/cart`).pipe();
  }

  /** Nosi sličicu za štampu, pa ide kao multipart/form-data. */
  dodaj(podaci: FormData) {
    return this.http.post<{ message: string; cart: Korpa }>(`${API}/cart/items`, podaci);
  }

  promeniKolicinu(stavkaId: string, quantity: number) {
    return this.http.patch<{ message: string; cart: Korpa }>(
      `${API}/cart/items/${stavkaId}`,
      { quantity }
    );
  }

  izbaci(stavkaId: string) {
    return this.http.delete<{ message: string; cart: Korpa }>(`${API}/cart/items/${stavkaId}`);
  }

  isprazni() {
    return this.http.delete<{ message: string; cart: Korpa }>(`${API}/cart`);
  }

  /**
   * Dugme POTVRDI.
   * Fizičko lice dobija po jednu fakturu za svaku štampariju; pravno lice ne
   * dobija fakture nego raspisanu javnu nabavku — vidi cart.controller.
   */
  zatvoriNarudzbinu() {
    return this.http.post<{
      message: string;
      invoices: IzdataFaktura[];
      procurement?: { _id: string; number: string; deadline: string; itemCount: number };
    }>(
      `${API}/cart/checkout`,
      {}
    );
  }

  /** Poziva se iz komponenti kad stigne nova verzija korpe. */
  osvezi(korpa: Korpa): Korpa {
    return this.zapamti(korpa);
  }

  /** Učitava samo broj stavki — koristi ga okvir aplikacije za oznaku u meniju. */
  ucitajBroj(): void {
    this.http.get<Korpa>(`${API}/cart`).subscribe({
      next: (korpa) => this.brojStavki.set(korpa.itemCount),
      // Neuspeh ovde ne sme ništa da sruši: oznaka u meniju je udobnost.
      error: () => this.brojStavki.set(0),
    });
  }
}
