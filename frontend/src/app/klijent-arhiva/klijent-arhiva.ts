import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StavkaArhive } from '../models/models';
import { slikaUrl } from '../services/api';
import { InvoiceService } from '../services/invoice.service';

type PoljeArhive = 'date' | 'name' | 'quantity' | 'printer';

/**
 * Arhiva proizvoda.
 *
 * Tekst zadatka: klijent vidi sve proizvode u statusu „Primljeno", a u istoj
 * listi i one u statusu „Isporučeno", koje može prebaciti u „Primljeno".
 * Sortiranje: po datumu naručivanja (podrazumevano), nazivu proizvoda,
 * količini i štampariji.
 *
 * Ovo je spisak POJEDINAČNIH PROIZVODA, ne faktura — server rastavlja fakturu
 * na stavke. Status i dalje stoji na fakturi, pa potvrda prijema pomera celu
 * narudžbinu, a ne jednu stavku; poruka to i kaže.
 *
 * Za svaki PRIMLJEN proizvod klijent ovde ostavlja sviđanje ili nesviđanje i
 * komentar. Ocena i komentar idu zajedno, jednim upisom.
 */
@Component({
  selector: 'app-klijent-arhiva',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './klijent-arhiva.html',
  styleUrl: './klijent-arhiva.css',
})
export class KlijentArhiva implements OnInit {
  private servis = inject(InvoiceService);

  stavke: StavkaArhive[] = [];

  sort: PoljeArhive = 'date';
  smer: 'asc' | 'desc' = 'desc';

  poruka = '';
  greska = '';
  ucitavanje = true;
  slanje = '';

  /** Proizvod za koji je otvoren obrazac za ocenu. */
  uOceni = '';
  ocena: 1 | -1 = 1;
  komentar = '';

  slika = slikaUrl;

  ngOnInit(): void {
    this.ucitaj();
  }

  ucitaj(): void {
    this.ucitavanje = true;

    this.servis.arhiva(this.sort, this.smer).subscribe({
      next: (stavke) => {
        this.ucitavanje = false;
        this.stavke = stavke;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Arhiva trenutno nije dostupna.';
      },
    });
  }

  sortiraj(polje: PoljeArhive): void {
    if (this.sort === polje) {
      this.smer = this.smer === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = polje;
      this.smer = 'asc';
    }
    this.ucitaj();
  }

  strelica(polje: PoljeArhive): string {
    if (this.sort !== polje) return '';
    return this.smer === 'asc' ? ' ▲' : ' ▼';
  }

  // --- potvrda prijema ------------------------------------------------------

  potvrdiPrijem(stavka: StavkaArhive): void {
    this.poruka = '';
    this.greska = '';
    this.slanje = stavka.invoiceId;

    this.servis.potvrdiPrijem(stavka.invoiceId).subscribe({
      next: (odgovor) => {
        this.slanje = '';
        this.poruka = odgovor.message;
        // Status stoji na fakturi, pa se menja SVIM stavkama te fakture.
        for (const s of this.stavke) {
          if (s.invoiceId === stavka.invoiceId) {
            s.invoiceStatus = 'RECEIVED';
            s.canRate = true;
          }
        }
      },
      error: (g) => {
        this.slanje = '';
        this.greska = g.error?.message ?? 'Potvrda prijema nije uspela.';
      },
    });
  }

  // --- ocena i komentar -----------------------------------------------------

  otvoriOcenu(stavka: StavkaArhive): void {
    this.poruka = '';
    this.greska = '';

    if (this.uOceni === stavka.itemId) {
      this.uOceni = '';
      return;
    }

    this.uOceni = stavka.itemId;
    // Ako je već ocenjivao, obrazac se otvara na onome što je ostavio.
    this.ocena = stavka.myRating?.value ?? 1;
    this.komentar = stavka.myRating?.comment ?? '';
  }

  zatvoriOcenu(): void {
    this.uOceni = '';
    this.komentar = '';
  }

  posaljiOcenu(stavka: StavkaArhive): void {
    this.poruka = '';
    this.greska = '';
    this.slanje = stavka.itemId;

    this.servis.oceni(stavka.productId, this.ocena, this.komentar.trim()).subscribe({
      next: (odgovor) => {
        this.slanje = '';
        this.poruka = odgovor.message;

        // Isti proizvod može stajati na više faktura; ocena je po PROIZVODU,
        // pa se osvežava svuda gde se taj proizvod pojavljuje.
        const nova = { value: this.ocena, comment: this.komentar.trim(), updatedAt: '' };
        for (const s of this.stavke) {
          if (s.productId === stavka.productId) s.myRating = nova;
        }

        this.zatvoriOcenu();
      },
      error: (g) => {
        this.slanje = '';
        this.greska = g.error?.message ?? 'Čuvanje ocene nije uspelo.';
      },
    });
  }
}
