import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Proizvod } from '../models/models';
import { slikaUrl } from '../services/api';
import { CartService } from '../services/cart.service';
import { ProductService } from '../services/product.service';

/**
 * Priprema proizvoda — strana na koju vodi dugme DALJE sa detalja.
 *
 * Tekst zadatka: klijent unosi tekst ili postavlja sličicu, koja se prikazuje
 * na samoj slici proizvoda, bira boju i uslugu štampe, u polju za količinu
 * unosi broj komada, i dugmetom DODAJ U KORPU ubacuje u e-korpu. Uz to dva
 * dodatna dugmeta: PONIŠTI vraća stranu na početno stanje, NAZAD vodi na
 * detalje proizvoda.
 *
 * Prikaz štampe preko slike radi se CSS preklapanjem (`position: absolute`),
 * što fusnota 3 teksta zadatka izričito dozvoljava — nikakva obrada slika na
 * serveru nije potrebna. Sličica se šalje serveru samo da bi je štamparija
 * dobila uz narudžbinu.
 */
@Component({
  selector: 'app-klijent-priprema',
  imports: [FormsModule, RouterLink],
  templateUrl: './klijent-priprema.html',
  styleUrl: './klijent-priprema.css',
})
export class KlijentPriprema implements OnInit {
  private servis = inject(ProductService);
  private korpaServis = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  proizvod: Proizvod | null = null;

  kolicina = 1;
  boja = '';
  uslugaId = '';
  tekst = '';

  /** Položaj središta otiska i njegova širina, u procentima slike. */
  otisakX = 50;
  otisakY = 50;
  otisakSirina = 46;

  /** Prevlačenje otiska mišem je u toku. */
  private vuce = false;

  slicica: File | null = null;
  /** Adresa za pregled izabrane sličice, dok još nije poslata serveru. */
  pregledSlicice = '';

  greske: Record<string, string> = {};
  poruka = '';
  uspeh = '';
  slanje = false;
  ucitavanje = true;

  slika = slikaUrl;

  ngOnInit(): void {
    const id = String(this.route.snapshot.paramMap.get('id'));

    this.servis.detalji(id).subscribe({
      next: (podaci) => {
        this.ucitavanje = false;
        this.proizvod = podaci;
        this.ponisti();
      },
      error: (g) => {
        this.ucitavanje = false;
        this.poruka = g.error?.message ?? 'Proizvod nije pronađen.';
      },
    });
  }

  /** Izabrana usluga — treba joj dodatna cena za prikaz ukupnog iznosa. */
  get usluga() {
    return this.proizvod?.printServices.find((u) => u._id === this.uslugaId);
  }

  get cenaPoKomadu(): number {
    return (this.proizvod?.unitPrice ?? 0) + (this.usluga?.extraPricePerPiece ?? 0);
  }

  get ukupno(): number {
    return this.cenaPoKomadu * (this.kolicina || 0);
  }

  /** Ima li dovoljno na stanju za uneti broj komada. */
  get dovoljno(): boolean {
    return !!this.proizvod && this.kolicina <= this.proizvod.stock;
  }

  // --- sličica za štampu ----------------------------------------------------

  izabranaSlicica(dogadjaj: Event): void {
    const polje = dogadjaj.target as HTMLInputElement;
    const fajl = polje.files?.[0] ?? null;

    delete this.greske['printImage'];
    this.ocistiPregled();
    this.slicica = null;

    if (!fajl) return;

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(fajl.type)) {
      this.greske['printImage'] = 'Dozvoljeni su samo JPG, PNG i GIF formati.';
      polje.value = '';
      return;
    }

    this.slicica = fajl;
    this.pregledSlicice = URL.createObjectURL(fajl);
  }

  /** Oslobađa adresu pregleda — inače ostaje da visi u memoriji pregledača. */
  private ocistiPregled(): void {
    if (this.pregledSlicice) {
      URL.revokeObjectURL(this.pregledSlicice);
      this.pregledSlicice = '';
    }
  }

  // --- pomeranje otiska po proizvodu ----------------------------------------

  /** Ima li uopšte šta da se pomera — bez teksta i sličice nema otiska. */
  get imaOtisak(): boolean {
    return !!this.tekst.trim() || !!this.pregledSlicice;
  }

  /**
   * Prevlačenje otiska mišem ili prstom.
   *
   * Položaj se računa u PROCENTIMA slike, a ne u pikselima: ista priprema se
   * kasnije prikazuje u korpi i kod štampara, u drugim veličinama. Pikseli bi
   * važili samo na onoj širini na kojoj su izmereni.
   */
  pocniVucenje(dogadjaj: PointerEvent): void {
    if (!this.imaOtisak) return;

    this.vuce = true;
    (dogadjaj.target as HTMLElement).setPointerCapture(dogadjaj.pointerId);
    dogadjaj.preventDefault();
  }

  vuci(dogadjaj: PointerEvent, platno: HTMLElement): void {
    if (!this.vuce) return;

    const okvir = platno.getBoundingClientRect();
    if (!okvir.width || !okvir.height) return;

    // Ograničeno na samu sliku - otisak ne sme da izađe van proizvoda.
    this.otisakX = this.uOpsegu(((dogadjaj.clientX - okvir.left) / okvir.width) * 100);
    this.otisakY = this.uOpsegu(((dogadjaj.clientY - okvir.top) / okvir.height) * 100);
  }

  zavrsiVucenje(): void {
    this.vuce = false;
  }

  private uOpsegu(vrednost: number): number {
    return Math.min(100, Math.max(0, vrednost));
  }

  /** Sredi otisak na proizvodu, ako se odvuče negde gde ne treba. */
  centriraj(): void {
    this.otisakX = 50;
    this.otisakY = 50;
  }

  // --- dugmad ---------------------------------------------------------------

  /** PONIŠTI — vraća stranu na početno stanje, ne briše proizvod. */
  ponisti(): void {
    this.ocistiPregled();

    this.otisakX = 50;
    this.otisakY = 50;
    this.otisakSirina = 46;
    this.kolicina = 1;
    this.boja = this.proizvod?.availableColors[0] ?? 'Bela';
    this.uslugaId = '';
    this.tekst = '';
    this.slicica = null;
    this.greske = {};
    this.poruka = '';
    this.uspeh = '';
  }

  /** NAZAD — na stranu sa detaljima izabranog proizvoda. */
  nazad(): void {
    if (this.proizvod) {
      this.router.navigate(['/klijent/proizvod', this.proizvod._id]);
    }
  }

  dodajUKorpu(): void {
    if (!this.proizvod) return;

    this.poruka = '';
    this.uspeh = '';
    const nadjene: Record<string, string> = {};

    if (!Number.isInteger(this.kolicina) || this.kolicina < 1) {
      nadjene['quantity'] = 'Količina mora biti ceo broj veći od nule.';
    } else if (this.kolicina > this.proizvod.stock) {
      // Poruka koju tekst zadatka traži doslovno.
      nadjene['quantity'] = 'Nema dovoljno proizvoda trenutno na stanju.';
    }

    if (this.greske['printImage']) nadjene['printImage'] = this.greske['printImage'];

    this.greske = nadjene;
    if (Object.keys(nadjene).length) return;

    const podaci = new FormData();
    podaci.append('productId', this.proizvod._id);
    podaci.append('quantity', String(this.kolicina));
    podaci.append('color', this.boja);
    podaci.append('printText', this.tekst.trim());
    podaci.append('printX', String(Math.round(this.otisakX)));
    podaci.append('printY', String(Math.round(this.otisakY)));
    podaci.append('printScale', String(Math.round(this.otisakSirina)));
    if (this.uslugaId) podaci.append('printServiceId', this.uslugaId);
    if (this.slicica) podaci.append('printImage', this.slicica);

    this.slanje = true;
    this.korpaServis.dodaj(podaci).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.korpaServis.osvezi(odgovor.cart);
        this.router.navigate(['/klijent/korpa']);
      },
      error: (g) => {
        this.slanje = false;
        const izServera: Record<string, string> = {};
        for (const greska of g.error?.errors ?? []) izServera[greska.field] = greska.message;
        this.greske = izServera;

        if (!Object.keys(izServera).length) {
          this.poruka = g.error?.message ?? 'Dodavanje u korpu nije uspelo.';
        }
      },
    });
  }
}
