import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IzdataFaktura, Korpa, StavkaKorpe } from '../models/models';
import { slikaUrl } from '../services/api';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { FakturaZaPlacanje, Placanje } from '../placanje/placanje';

/**
 * Trenutna elektronska korpa.
 *
 * Tekst zadatka: klijent vidi sve naručene proizvode GRUPISANO PO ŠTAMPARIJAMA,
 * sa punim nazivom proizvoda, količinom, tipom štampe i ukupnom cenom za taj
 * proizvod. Dugmetom POTVRDI formira se po jedna faktura za svaku štampariju.
 *
 * Grupisanje radi server, jer je isto grupisanje ono po kojem se prave fakture
 * — da se ista podela ne bi računala na dva mesta i razišla.
 */
@Component({
  selector: 'app-klijent-korpa',
  imports: [DatePipe, DecimalPipe, FormsModule, Placanje, RouterLink],
  templateUrl: './klijent-korpa.html',
  styleUrl: './klijent-korpa.css',
})
export class KlijentKorpa implements OnInit {
  private servis = inject(CartService);
  private auth = inject(AuthService);

  korpa: Korpa | null = null;

  poruka = '';
  greska = '';
  ucitavanje = true;
  slanje = false;

  /** Fakture izdate posle POTVRDI — prikazuju se umesto korpe. */
  izdate: IzdataFaktura[] | null = null;

  /** Nabavka raspisana posle POTVRDI, ako je klijent pravno lice. */
  nabavka: { number: string; deadline: string; itemCount: number } | null = null;

  /** Fakture koje jos nisu placene - njih obrazac za placanje nudi. */
  get zaPlacanje(): FakturaZaPlacanje[] {
    return (this.izdate ?? []).filter((f) => !this.placeneFakture.has(f._id));
  }

  /** Identifikatori vec placenih faktura iz ove kupovine. */
  placeneFakture = new Set<string>();

  /** Je li korisnik odustao od placanja i izabrao da plati kasnije. */
  platiKasnije = false;

  oznaciPlacene(identifikatori: string[]): void {
    for (const id of identifikatori) this.placeneFakture.add(id);
  }

  slika = slikaUrl;

  ngOnInit(): void {
    this.servis.korpa().subscribe({
      next: (korpa) => {
        this.ucitavanje = false;
        this.korpa = this.servis.osvezi(korpa);
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Korpa trenutno nije dostupna.';
      },
    });
  }

  /**
   * Pravno lice iz korpe ne dobija fakture nego raspisuje javnu nabavku —
   * tako traži tekst zadatka, i to je jedina razlika između dva tipa klijenta
   * u ovom koraku. Strana zato unapred kaže šta će se desiti na „Potvrdi".
   */
  get jePravnoLice(): boolean {
    return this.auth.jeTipa('CLIENT_COMPANY');
  }

  /** Ima li stavki kojima je u međuvremenu ponestalo na lageru. */
  get imaNedostupnih(): boolean {
    return !!this.korpa?.groups.some((g) => g.items.some((s) => !s.available));
  }

  private primi(korpa: Korpa, poruka?: string): void {
    this.korpa = this.servis.osvezi(korpa);
    this.greska = '';
    if (poruka) this.poruka = poruka;
  }

  private pao(g: { error?: { message?: string } }, podrazumevano: string): void {
    this.slanje = false;
    this.poruka = '';
    this.greska = g.error?.message ?? podrazumevano;
  }

  // --- izmene korpe ---------------------------------------------------------

  promeniKolicinu(stavka: StavkaKorpe, vrednost: string): void {
    const kolicina = Number(vrednost);

    if (!Number.isInteger(kolicina) || kolicina < 1) {
      this.greska = 'Količina mora biti ceo broj veći od nule.';
      return;
    }

    this.slanje = true;
    this.servis.promeniKolicinu(stavka._id, kolicina).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.primi(odgovor.cart, odgovor.message);
      },
      error: (g) => this.pao(g, 'Izmena količine nije uspela.'),
    });
  }

  izbaci(stavka: StavkaKorpe): void {
    this.slanje = true;
    this.servis.izbaci(stavka._id).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.primi(odgovor.cart, odgovor.message);
      },
      error: (g) => this.pao(g, 'Izbacivanje nije uspelo.'),
    });
  }

  isprazni(): void {
    this.slanje = true;
    this.servis.isprazni().subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.primi(odgovor.cart, odgovor.message);
      },
      error: (g) => this.pao(g, 'Pražnjenje korpe nije uspelo.'),
    });
  }

  // --- POTVRDI --------------------------------------------------------------

  potvrdi(): void {
    this.poruka = '';
    this.greska = '';
    this.slanje = true;

    this.servis.zatvoriNarudzbinu().subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;

        // Pravno lice ne dobija fakture nego raspisanu javnu nabavku.
        this.nabavka = odgovor.procurement ?? null;
        this.izdate = odgovor.invoices;
        this.korpa = this.servis.osvezi({
          groups: [],
          itemCount: 0,
          total: 0,
          invoiceCount: 0,
        });
      },
      error: (g) => this.pao(g, 'Zatvaranje narudžbine nije uspelo.'),
    });
  }
}
