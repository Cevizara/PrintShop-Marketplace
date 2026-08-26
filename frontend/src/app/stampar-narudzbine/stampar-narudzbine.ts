import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NAZIV_STATUSA, Narudzbina, StatusNarudzbine } from '../models/models';
import { slikaUrl } from '../services/api';
import { InvoiceService, PoljeSortiranja } from '../services/invoice.service';

/**
 * Naručeni proizvodi kod štamparije, sa promenom statusa.
 *
 * Tekst zadatka: „štampar ima samo privilegiju da prebaci status iz naručeno u
 * status u štampi, i nakon toga u status isporučeno". Dakle dva prelaza, i oba
 * samo unapred.
 *
 * Dugme ne šalje ŽELJENI status nego samo traži sledeći korak — koji je to
 * korak odlučuje server. Da se status slao iz forme, štampar bi mogao da
 * pošalje „isporučeno" za posao koji nije ni odštampan.
 */
@Component({
  selector: 'app-stampar-narudzbine',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './stampar-narudzbine.html',
  styleUrl: './stampar-narudzbine.css',
})
export class StamparNarudzbine implements OnInit {
  private servis = inject(InvoiceService);

  readonly statusi: { vrednost: StatusNarudzbine | ''; naziv: string }[] = [
    { vrednost: '', naziv: 'Svi statusi' },
    { vrednost: 'ORDERED', naziv: 'Naručeno' },
    { vrednost: 'PRINTING', naziv: 'U štampi' },
    { vrednost: 'DELIVERED', naziv: 'Isporučeno' },
    { vrednost: 'RECEIVED', naziv: 'Primljeno' },
    { vrednost: 'CANCELLED', naziv: 'Otkazano' },
  ];

  narudzbine: Narudzbina[] = [];

  status: StatusNarudzbine | '' = '';
  sort: PoljeSortiranja = 'date';
  smer: 'asc' | 'desc' = 'desc';

  poruka = '';
  greska = '';
  ucitavanje = true;
  slanje = '';

  slika = slikaUrl;

  ngOnInit(): void {
    this.ucitaj();
  }

  ucitaj(): void {
    this.ucitavanje = true;

    this.servis.narudzbineStamparije(this.status, this.sort, this.smer).subscribe({
      next: (narudzbine) => {
        this.ucitavanje = false;
        this.narudzbine = narudzbine;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Narudžbine trenutno nisu dostupne.';
      },
    });
  }

  sortiraj(polje: PoljeSortiranja): void {
    if (this.sort === polje) {
      this.smer = this.smer === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = polje;
      this.smer = 'asc';
    }
    this.ucitaj();
  }

  strelica(polje: PoljeSortiranja): string {
    if (this.sort !== polje) return '';
    return this.smer === 'asc' ? ' ▲' : ' ▼';
  }

  // --- prikaz ---------------------------------------------------------------

  nazivStatusa(status: StatusNarudzbine): string {
    return NAZIV_STATUSA[status] ?? status;
  }

  bojaStatusa(status: StatusNarudzbine): string {
    switch (status) {
      case 'RECEIVED':
        return '#1F7A4C';
      case 'DELIVERED':
        return 'var(--cijan)';
      case 'PRINTING':
        return 'var(--magenta)';
      case 'CANCELLED':
        return 'var(--crvena-zemlja)';
      default:
        return 'var(--mastilo-blago)';
    }
  }

  /** Šta piše na dugmetu — i praznina znači da štampar više nema šta da uradi. */
  sledeciKorak(narudzbina: Narudzbina): string {
    switch (narudzbina.status) {
      case 'ORDERED':
      case 'PAID':
        return 'Prebaci u štampu';
      case 'PRINTING':
        return 'Označi kao isporučeno';
      default:
        return '';
    }
  }

  /** Zašto dugmeta nema — da red ne bude nem. */
  objasnjenje(narudzbina: Narudzbina): string {
    switch (narudzbina.status) {
      case 'DELIVERED':
        return 'Čeka se da klijent potvrdi prijem.';
      case 'RECEIVED':
        return 'Narudžbina je završena.';
      case 'CANCELLED':
        return 'Klijent je otkazao narudžbinu.';
      default:
        return '';
    }
  }

  brojKomada(narudzbina: Narudzbina): number {
    return narudzbina.items.reduce((zbir, s) => zbir + s.quantity, 0);
  }

  // --- promena statusa ------------------------------------------------------

  pomeri(narudzbina: Narudzbina): void {
    this.poruka = '';
    this.greska = '';
    this.slanje = narudzbina._id;

    this.servis.pomeriStatus(narudzbina._id).subscribe({
      next: (odgovor) => {
        this.slanje = '';
        this.poruka = odgovor.message;

        // Server na prelazu vraća golu fakturu, bez imena klijenta — ono nastaje
        // spajanjem samo u tabeli. Zato se prepisuje samo status.
        const mesto = this.narudzbine.findIndex((n) => n._id === odgovor.invoice._id);
        if (mesto >= 0) {
          this.narudzbine[mesto] = {
            ...this.narudzbine[mesto],
            status: odgovor.invoice.status,
          };
        }
      },
      error: (g) => {
        this.slanje = '';
        this.greska = g.error?.message ?? 'Promena statusa nije uspela.';
      },
    });
  }
}
