import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { loadStripe, Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { InvoiceService } from '../services/invoice.service';

export interface FakturaZaPlacanje {
  _id: string;
  number: string;
  total: number;
}

/**
 * Stripe režim: kartično polje je Stripe Elements iframe. Broj, CVC i datum
 * zato ne ulaze u Angular promenljive, HTTP zahtev niti backend. Bez Stripe
 * ključeva ostaje postojeći lokalni demonstracioni obrazac.
 */
@Component({
  selector: 'app-placanje',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './placanje.html',
  styleUrl: './placanje.css',
})
export class Placanje implements OnInit, OnDestroy {
  private servis = inject(InvoiceService);

  @Input({ required: true }) fakture: FakturaZaPlacanje[] = [];
  @Output() placeno = new EventEmitter<string[]>();
  @Output() odustao = new EventEmitter<void>();
  @ViewChild('stripeKartica')
  set stripeKartica(element: ElementRef<HTMLDivElement> | undefined) {
    this.stripeKarticaHost = element?.nativeElement;
    void this.montirajStripe();
  }

  readonly tipovi = ['Visa', 'Mastercard', 'American Express', 'Diners Club', 'Discover'];
  tip = 'Visa';
  broj = '';
  cvc = '';
  rok = '';
  vlasnik = '';
  greska = '';
  uspeh = '';
  slanje = false;
  ucitava = true;
  rezim: 'stripe' | 'local' | null = null;

  private clientSecret = '';
  private publishableKey = '';
  private stripeKarticaHost?: HTMLDivElement;
  private stripe: Stripe | null = null;
  private elementi: StripeElements | null = null;
  private kartica: StripeCardElement | null = null;

  get ukupno(): number {
    return this.fakture.reduce((zbir, faktura) => zbir + faktura.total, 0);
  }

  ngOnInit(): void {
    this.servis.zapocniPlacanje(this.fakture.map((faktura) => faktura._id)).subscribe({
      next: (odgovor) => {
        this.rezim = odgovor.mode;
        this.ucitava = false;
        if (odgovor.mode === 'stripe') {
          this.clientSecret = odgovor.clientSecret;
          this.publishableKey = odgovor.publishableKey;
          void this.montirajStripe();
        }
      },
      error: (greska) => {
        this.ucitava = false;
        this.greska = greska.error?.message ?? 'Plaćanje trenutno nije dostupno.';
      },
    });
  }

  ngOnDestroy(): void {
    this.kartica?.unmount();
  }

  async montirajStripe(): Promise<void> {
    // Poziva ga i odgovor servera i @ViewChild setter. Montira se tek kada su
    // prisutni i Stripe ključ i stvarni HTML element koji Angular stvara u @if.
    if (!this.publishableKey || !this.stripeKarticaHost || this.kartica) return;

    this.stripe = await loadStripe(this.publishableKey);
    if (!this.stripe) {
      this.greska = 'Stripe obrazac nije mogao da se učita.';
      return;
    }

    this.elementi = this.stripe.elements();
    this.kartica = this.elementi.create('card', {
      // Tekst zadatka traži broj kartice, MM/GG i CVC. Poštanski broj je
      // Stripe-ov podrazumevani dodatak za AVS proveru, ali za Test Mode i
      // naš obrazac nije potreban.
      hidePostalCode: true,
      style: {
        base: {
          color: '#202321',
          fontFamily: '"Archivo", Arial, sans-serif',
          fontSize: '16px',
          '::placeholder': { color: '#77766f' },
        },
      },
    });
    this.kartica.on('change', (dogadjaj) => {
      this.greska = dogadjaj.error?.message ?? '';
    });
    this.kartica.mount(this.stripeKarticaHost);
  }

  formatirajBroj(vrednost: string): void {
    const cifre = vrednost.replace(/\D/g, '').slice(0, 19);
    this.broj = cifre.replace(/(.{4})/g, '$1 ').trim();
  }

  formatirajRok(vrednost: string): void {
    const cifre = vrednost.replace(/\D/g, '').slice(0, 4);
    this.rok = cifre.length > 2 ? cifre.slice(0, 2) + '/' + cifre.slice(2) : cifre;
  }

  plati(): void {
    this.greska = '';
    this.uspeh = '';
    if (this.rezim === 'stripe') {
      void this.platiStripe();
      return;
    }
    this.platiLokalno();
  }

  private async platiStripe(): Promise<void> {
    if (!this.stripe || !this.kartica || !this.clientSecret) {
      this.greska = 'Stripe obrazac još nije spreman.';
      return;
    }
    this.slanje = true;
    const rezultat = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.kartica, billing_details: { name: this.vlasnik || undefined } },
    });
    if (rezultat.error || !rezultat.paymentIntent || rezultat.paymentIntent.status !== 'succeeded') {
      this.slanje = false;
      this.greska = rezultat.error?.message ?? 'Stripe nije potvrdio plaćanje.';
      return;
    }

    this.servis
      .potvrdiStripePlacanje(this.fakture.map((faktura) => faktura._id), rezultat.paymentIntent.id)
      .subscribe({
        next: (odgovor) => this.uspesnoPlacanje(odgovor),
        error: (greska) => {
          this.slanje = false;
          this.greska = greska.error?.message ?? 'Server nije potvrdio Stripe plaćanje.';
        },
      });
  }

  private platiLokalno(): void {
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
    this.servis.plati(this.fakture.map((faktura) => faktura._id), this.broj.replace(/\D/g, ''), this.cvc, this.rok)
      .subscribe({
        next: (odgovor) => this.uspesnoPlacanje(odgovor),
        error: (greska) => {
          this.slanje = false;
          this.greska = greska.error?.message ?? 'Plaćanje nije uspelo. Pokušajte ponovo.';
        },
      });
  }

  private uspesnoPlacanje(odgovor: { message: string; brand: string; last4: string; paid: { _id: string }[] }): void {
    this.slanje = false;
    this.uspeh = `${odgovor.message} (${odgovor.brand} •••• ${odgovor.last4})`;
    this.broj = '';
    this.cvc = '';
    this.rok = '';
    this.vlasnik = '';
    this.placeno.emit(odgovor.paid.map((faktura) => faktura._id));
  }
}
