import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IzvestajUvoza, Proizvod } from '../models/models';
import { slikaUrl } from '../services/api';
import { ProductService } from '../services/product.service';

/**
 * Uvoz lager liste iz JSON fajla (Prilog 1 teksta zadatka).
 *
 * Radi u dva koraka, kako i traži tekst: "U dodatnom koraku po učitavanju
 * fajla, dodati i slike."
 *
 *   1. fajl se pošalje serveru, koji od njega napravi proizvode
 *   2. za svaki uvezen proizvod se, ako se želi, dodaju slike
 *
 * Zašto slike ne mogu iz fajla: polja "slikaUrl" i "dodatneSlike" u primeru
 * jesu prazna, ali i da nisu, tekst zadatka izričito zabranjuje unos slike
 * "putem eksternog linka do slike na drugoj lokaciji". Uvezeni proizvodi zato
 * dobijaju podrazumevanu sliku, a prave se dodaju kroz FileUpload.
 */
@Component({
  selector: 'app-stampar-uvoz',
  imports: [RouterLink],
  templateUrl: './stampar-uvoz.html',
  styleUrl: './stampar-uvoz.css',
})
export class StamparUvoz {
  private servis = inject(ProductService);

  fajl: File | null = null;
  imeFajla = '';

  izvestaj: IzvestajUvoza | null = null;
  poruka = '';
  slanje = false;

  /** Proizvod kojem se u drugom koraku dodaju slike. */
  uSlikama = '';
  glavnaSlika: File | null = null;
  dodatneSlike: File[] = [];
  greskaSlika = '';
  slanjeSlika = false;

  slika = slikaUrl;

  izabranFajl(dogadjaj: Event): void {
    const polje = dogadjaj.target as HTMLInputElement;
    const fajl = polje.files?.[0] ?? null;

    this.poruka = '';
    this.fajl = null;
    this.imeFajla = '';

    if (!fajl) return;

    // Neki pregledači ne postave tip za .json, pa se gleda i nastavak imena.
    const jeJson = fajl.type === 'application/json' || fajl.name.toLowerCase().endsWith('.json');

    if (!jeJson) {
      this.poruka = 'Očekuje se JSON fajl sa lager listom.';
      polje.value = '';
      return;
    }

    this.fajl = fajl;
    this.imeFajla = `${fajl.name} (${Math.round(fajl.size / 1024)} kB)`;
  }

  uvezi(): void {
    if (!this.fajl) {
      this.poruka = 'Niste izabrali fajl.';
      return;
    }

    this.poruka = '';
    this.slanje = true;

    this.servis.uvezi(this.fajl).subscribe({
      next: (izvestaj) => {
        this.slanje = false;
        this.izvestaj = izvestaj;
        this.fajl = null;
        this.imeFajla = '';
      },
      error: (g) => {
        this.slanje = false;
        this.poruka = g.error?.message ?? 'Uvoz nije uspeo.';
      },
    });
  }

  ponovo(): void {
    this.izvestaj = null;
    this.poruka = '';
    this.zatvoriSlike();
  }

  // --- drugi korak: slike ---------------------------------------------------

  otvoriSlike(proizvod: Proizvod): void {
    this.uSlikama = this.uSlikama === proizvod._id ? '' : proizvod._id;
    this.glavnaSlika = null;
    this.dodatneSlike = [];
    this.greskaSlika = '';
  }

  zatvoriSlike(): void {
    this.uSlikama = '';
    this.glavnaSlika = null;
    this.dodatneSlike = [];
    this.greskaSlika = '';
  }

  izabranaGlavna(dogadjaj: Event): void {
    const fajl = (dogadjaj.target as HTMLInputElement).files?.[0] ?? null;
    this.greskaSlika = '';

    if (fajl && !this.jeSlika(fajl)) {
      this.greskaSlika = 'Dozvoljeni su samo JPG, PNG i GIF formati.';
      this.glavnaSlika = null;
      return;
    }

    this.glavnaSlika = fajl;
  }

  izabraneDodatne(dogadjaj: Event): void {
    const fajlovi = Array.from((dogadjaj.target as HTMLInputElement).files ?? []);
    this.greskaSlika = '';

    if (fajlovi.some((f) => !this.jeSlika(f))) {
      this.greskaSlika = 'Dozvoljeni su samo JPG, PNG i GIF formati.';
      this.dodatneSlike = [];
      return;
    }

    if (fajlovi.length > 3) {
      this.greskaSlika = 'Galerija prima najviše 3 dodatne slike.';
      this.dodatneSlike = [];
      return;
    }

    this.dodatneSlike = fajlovi;
  }

  private jeSlika(fajl: File): boolean {
    return ['image/jpeg', 'image/png', 'image/gif'].includes(fajl.type);
  }

  posaljiSlike(proizvod: Proizvod): void {
    if (!this.glavnaSlika && !this.dodatneSlike.length) {
      this.greskaSlika = 'Niste izabrali nijednu sliku.';
      return;
    }

    const podaci = new FormData();
    if (this.glavnaSlika) podaci.append('mainImage', this.glavnaSlika);
    for (const fajl of this.dodatneSlike) podaci.append('additionalImages', fajl);

    this.slanjeSlika = true;
    this.servis.dodajSlike(proizvod._id, podaci).subscribe({
      next: (odgovor) => {
        this.slanjeSlika = false;

        // Proizvod se zamenjuje u izveštaju, da se odmah vidi nova slika.
        if (this.izvestaj) {
          const mesto = this.izvestaj.products.findIndex((p) => p._id === odgovor.product._id);
          if (mesto >= 0) this.izvestaj.products[mesto] = odgovor.product;
        }

        this.zatvoriSlike();
      },
      error: (g) => {
        this.slanjeSlika = false;
        this.greskaSlika = g.error?.message ?? 'Slanje slika nije uspelo.';
      },
    });
  }
}
