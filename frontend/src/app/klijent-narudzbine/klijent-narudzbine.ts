import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NAZIV_STATUSA, Narudzbina, StatusNarudzbine } from '../models/models';
import { InvoiceService, PoljeSortiranja } from '../services/invoice.service';
import { otvoriPdf } from '../services/preuzimanje';
import { FakturaZaPlacanje, Placanje } from '../placanje/placanje';

/**
 * Tabela narudžbina klijenta.
 *
 * Tekst zadatka traži tabelu sa „svim prethodno realizovanim i trenutno
 * aktuelnim još uvek nerealizovanim narudžbinama" i mogućnošću sortiranja.
 * Kolone su tačno one koje tekst nabraja: ID fakture, naziv štamparije, grad,
 * numerisani proizvodi sa količinom u zagradi, ukupan iznos, i dugme „Otkaži" —
 * ali samo pored narudžbine u statusu „naručeno".
 *
 * Sortiranje radi SERVER, a ne strana: sortira se i po nazivu štamparije, koji
 * se ne čuva na fakturi nego se dobija spajanjem sa korisnikom.
 */
@Component({
  selector: 'app-klijent-narudzbine',
  imports: [DatePipe, DecimalPipe, Placanje, RouterLink],
  templateUrl: './klijent-narudzbine.html',
  styleUrl: './klijent-narudzbine.css',
})
export class KlijentNarudzbine implements OnInit {
  private servis = inject(InvoiceService);

  narudzbine: Narudzbina[] = [];

  sort: PoljeSortiranja = 'date';
  smer: 'asc' | 'desc' = 'desc';

  poruka = '';
  greska = '';
  ucitavanje = true;
  slanje = false;

  /** Narudžbina za koju je zatražena potvrda otkazivanja. */
  zaOtkazivanje: Narudzbina | null = null;

  /** Narudžbina za koju je otvoren obrazac za plaćanje. */
  uPlacanju = '';

  /** Plaća se samo narudžbina koja je još u statusu „naručeno”. */
  moziPlatiti(narudzbina: Narudzbina): boolean {
    return narudzbina.status === 'ORDERED';
  }

  /** Obrazac za plaćanje prima niz faktura — ovde je uvek tačno jedna. */
  zaPlacanje(narudzbina: Narudzbina): FakturaZaPlacanje[] {
    return [{ _id: narudzbina._id, number: narudzbina.number, total: narudzbina.total }];
  }

  otvoriPlacanje(narudzbina: Narudzbina): void {
    this.poruka = '';
    this.greska = '';
    this.zaOtkazivanje = null;
    this.uPlacanju = this.uPlacanju === narudzbina._id ? '' : narudzbina._id;
  }

  posleUplate(narudzbina: Narudzbina): void {
    narudzbina.status = 'PAID';
    this.poruka = `Faktura ${narudzbina.number} je plaćena.`;
    this.uPlacanju = '';
  }

  ngOnInit(): void {
    this.ucitaj();
  }

  ucitaj(): void {
    this.ucitavanje = true;

    this.servis.mojeNarudzbine(this.sort, this.smer).subscribe({
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

  /** Klik na zaglavlje kolone: isto polje menja smer, drugo počinje rastuće. */
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

  /** Tekst zadatka traži da dugme stoji SAMO pored narudžbine u statusu „naručeno". */
  moziOtkazati(narudzbina: Narudzbina): boolean {
    return narudzbina.status === 'ORDERED';
  }

  /** Prijem potvrđuje klijent, i to samo za isporučenu narudžbinu. */
  moziPotvrditiPrijem(narudzbina: Narudzbina): boolean {
    return narudzbina.status === 'DELIVERED';
  }

  /**
   * PDF fakture.
   *
   * Ista faktura je već poslata na i-mejl pri zatvaranju narudžbine; ovo je
   * drugi put do istog dokumenta, koji radi i kada pošta nije prošla.
   */
  preuzmiPdf(narudzbina: Narudzbina): void {
    this.greska = '';

    this.servis.pdf(narudzbina._id).subscribe({
      next: (sadrzaj) => otvoriPdf(sadrzaj, narudzbina.number + '.pdf'),
      error: () => (this.greska = 'PDF fakture trenutno nije dostupan.'),
    });
  }

  // --- akcije ---------------------------------------------------------------

  potvrdiOtkazivanje(narudzbina: Narudzbina): void {
    this.poruka = '';
    this.greska = '';
    this.zaOtkazivanje = narudzbina;
  }

  odustani(): void {
    this.zaOtkazivanje = null;
  }

  otkazi(): void {
    if (!this.zaOtkazivanje) return;

    this.slanje = true;
    this.servis.otkazi(this.zaOtkazivanje._id).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.zameni(odgovor.invoice);
        this.zaOtkazivanje = null;
      },
      error: (g) => {
        this.slanje = false;
        this.greska = g.error?.message ?? 'Otkazivanje nije uspelo.';
        this.zaOtkazivanje = null;
      },
    });
  }

  potvrdiPrijem(narudzbina: Narudzbina): void {
    this.poruka = '';
    this.greska = '';
    this.slanje = true;

    this.servis.potvrdiPrijem(narudzbina._id).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.zameni(odgovor.invoice);
      },
      error: (g) => {
        this.slanje = false;
        this.greska = g.error?.message ?? 'Potvrda prijema nije uspela.';
      },
    });
  }

  /**
   * Menja narudžbinu u mestu.
   *
   * Server na prelazima statusa vraća golu fakturu, bez naziva štamparije — on
   * nastaje spajanjem samo u tabeli. Zato se prepisuje samo status, da ime
   * štamparije ne bi nestalo iz reda.
   */
  private zameni(izmenjena: Narudzbina): void {
    const mesto = this.narudzbine.findIndex((n) => n._id === izmenjena._id);
    if (mesto >= 0) {
      this.narudzbine[mesto] = { ...this.narudzbine[mesto], status: izmenjena.status };
    }
  }
}
