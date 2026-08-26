import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Proizvod } from '../models/models';
import { slikaUrl } from '../services/api';
import { ProductService } from '../services/product.service';

/**
 * Lager lista štamparije: pregled svojih proizvoda i ažuriranje količina.
 *
 * Količina se menja u samom redu tabele. Tekst zadatka traži samo promenu
 * količine ("za sve postojeće proizvode može se promeniti količina"), pa je to
 * jedino polje koje se ovde menja - ostalo se unosi pri dodavanju proizvoda.
 */
@Component({
  selector: 'app-stampar-proizvodi',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './stampar-proizvodi.html',
  styleUrl: './stampar-proizvodi.css',
})
export class StamparProizvodi implements OnInit {
  private servis = inject(ProductService);

  proizvodi: Proizvod[] = [];

  poruka = '';
  greska = '';
  ucitavanje = true;

  /** Proizvod čija se količina trenutno menja, i uneta vrednost. */
  uIzmeni = '';
  novaKolicina = 0;
  slanje = false;

  /** Proizvod kojem se dodaju slike. */
  uSlikama = '';
  glavnaSlika: File | null = null;
  dodatneSlike: File[] = [];
  greskaSlika = '';
  slanjeSlika = false;

  slika = slikaUrl;

  ngOnInit(): void {
    this.servis.mojiProizvodi().subscribe({
      next: (proizvodi) => {
        this.ucitavanje = false;
        this.proizvodi = proizvodi;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Lager lista trenutno nije dostupna.';
      },
    });
  }

  get bezZaliha(): number {
    return this.proizvodi.filter((p) => p.stock === 0).length;
  }

  // --- količina -------------------------------------------------------------

  otvoriIzmenu(proizvod: Proizvod): void {
    this.zatvoriSlike();
    this.poruka = '';
    this.greska = '';
    this.uIzmeni = proizvod._id;
    this.novaKolicina = proizvod.stock;
  }

  zatvoriIzmenu(): void {
    this.uIzmeni = '';
  }

  sacuvajKolicinu(proizvod: Proizvod): void {
    this.poruka = '';
    this.greska = '';

    // Ista provera stoji i na serveru - ova je samo da korisnik odmah vidi.
    if (!Number.isInteger(this.novaKolicina) || this.novaKolicina < 0) {
      this.greska = 'Količina mora biti ceo broj koji nije negativan.';
      return;
    }

    this.slanje = true;
    this.servis.azurirajZalihe(proizvod._id, this.novaKolicina).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.zameni(odgovor.product);
        this.zatvoriIzmenu();
      },
      error: (g) => {
        this.slanje = false;
        this.greska = g.error?.errors?.[0]?.message ?? g.error?.message ?? 'Izmena nije uspela.';
      },
    });
  }

  /** Menja proizvod u mestu, da tabela ne skoči na vrh posle svake izmene. */
  private zameni(proizvod: Proizvod): void {
    const mesto = this.proizvodi.findIndex((p) => p._id === proizvod._id);
    if (mesto >= 0) this.proizvodi[mesto] = proizvod;
  }

  // --- slike ----------------------------------------------------------------

  otvoriSlike(proizvod: Proizvod): void {
    this.zatvoriIzmenu();
    this.poruka = '';
    this.greska = '';
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

    this.dodatneSlike = fajlovi;
  }

  private jeSlika(fajl: File): boolean {
    return ['image/jpeg', 'image/png', 'image/gif'].includes(fajl.type);
  }

  /** Koliko još slika staje u galeriju - tekst zadatka dozvoljava najviše tri. */
  slobodnihMesta(proizvod: Proizvod): number {
    return 3 - proizvod.additionalImages.length;
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
        this.poruka = odgovor.message;
        this.zameni(odgovor.product);
        this.zatvoriSlike();
      },
      error: (g) => {
        this.slanjeSlika = false;
        this.greskaSlika = g.error?.message ?? 'Slanje slika nije uspelo.';
      },
    });
  }
}
