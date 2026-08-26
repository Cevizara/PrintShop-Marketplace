import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../services/invoice.service';

/** Faktura koja se plaća — samo ono što obrazac treba da prikaže. */
export interface FakturaZaPlacanje {
  _id: string;
  number: string;
  total: number;
}

/**
 * Obrazac za plaćanje karticom.
 *
 * Tekst zadatka: „U e-korpi realizovati nakon pritiska na dugme POTVRDI
 * besplatan servis za plaćanje (npr. Stripe Test Mode / Sandbox PayPal
 * Developer) gde klijent unosi podatke o tipu kartice, broju kartice sa koje
 * plaća fakturu/fakture, CVC kod kartice i datum isticanja kartice (MM/GG)."
 *
 * Zato prima NIZ faktura: jedna kupovina iz korpe može da napravi više faktura,
 * a plaćaju se jednom karticom, odjednom.
 *
 * Zajednička komponenta, jer se isti obrazac otvara na dva mesta — u korpi
 * odmah posle potvrde, i u tabeli narudžbina za fakturu koja je ostala
 * neplaćena. Da je pisana dvaput, provere bi se vremenom razišle.
 *
 * NIŠTA od unetog se ne pamti u komponenti duže nego što treba: posle uspešnog
 * plaćanja polja se brišu. Broj kartice i CVC ionako nikada ne stižu do baze —
 * server čuva samo tip kartice i poslednje četiri cifre.
 */
@Component({
  selector: 'app-placanje',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './placanje.html',
  styleUrl: './placanje.css',
})
export class Placanje {
  private servis = inject(InvoiceService);

  /** Fakture koje se plaćaju ovim jednim plaćanjem. */
  @Input({ required: true }) fakture: FakturaZaPlacanje[] = [];

  /** Javlja roditelju da je plaćeno, da osveži svoj prikaz. */
  @Output() placeno = new EventEmitter<string[]>();

  /** Javlja da je korisnik odustao. */
  @Output() odustao = new EventEmitter<void>();

  readonly tipovi = ['Visa', 'Mastercard', 'American Express', 'Diners Club', 'Discover'];

  tip = 'Visa';
  broj = '';
  cvc = '';
  rok = '';
  vlasnik = '';

  greska = '';
  uspeh = '';
  slanje = false;

  get ukupno(): number {
    return this.fakture.reduce((zbir, f) => zbir + f.total, 0);
  }

  /**
   * Broj kartice se prikazuje u grupama po četiri, kao na samoj kartici.
   * Serveru se šalju gole cifre — grupisanje je stvar čitljivosti.
   */
  formatirajBroj(vrednost: string): void {
    const cifre = vrednost.replace(/\D/g, '').slice(0, 19);
    this.broj = cifre.replace(/(.{4})/g, '$1 ').trim();
  }

  /** MM/GG — kosa crta se dodaje sama, da korisnik ne mora da je kuca. */
  formatirajRok(vrednost: string): void {
    const cifre = vrednost.replace(/\D/g, '').slice(0, 4);
    this.rok = cifre.length > 2 ? cifre.slice(0, 2) + '/' + cifre.slice(2) : cifre;
  }

  plati(): void {
    this.greska = '';
    this.uspeh = '';

    // Osnovne provere i ovde, radi brže poruke. Server ih ponavlja sve, uz
    // Luhn proveru broja — klijentska provera se zaobilazi.
    if (!this.broj.replace(/\D/g, '')) {
      this.greska = 'Unesite broj kartice.';
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(this.rok)) {
      this.greska = 'Datum isticanja se unosi u obliku MM/GG.';
      return;
    }
    if (!/^\d{3,4}$/.test(this.cvc)) {
      this.greska = 'CVC kod ima 3 cifre, a kod American Express kartice 4.';
      return;
    }

    this.slanje = true;

    this.servis
      .plati(
        this.fakture.map((f) => f._id),
        this.broj.replace(/\D/g, ''),
        this.cvc,
        this.rok
      )
      .subscribe({
        next: (odgovor) => {
          this.slanje = false;
          this.uspeh = `${odgovor.message} (${odgovor.brand} •••• ${odgovor.last4})`;

          // Podaci kartice se ne zadržavaju ni u memoriji strane.
          this.broj = '';
          this.cvc = '';
          this.rok = '';
          this.vlasnik = '';

          this.placeno.emit(odgovor.paid.map((f) => f._id));
        },
        error: (g) => {
          this.slanje = false;
          // Tekst zadatka: „ako nije, ispisuje se poruka, i ponavlja se opet
          // korak plaćanja" — obrazac zato ostaje otvoren, sa unetim brojem.
          this.greska = g.error?.message ?? 'Plaćanje nije uspelo. Pokušajte ponovo.';
        },
      });
  }
}
