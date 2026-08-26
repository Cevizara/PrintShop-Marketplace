import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Proizvod } from '../models/models';
import { slikaUrl } from '../services/api';
import { CookieService } from '../services/cookie.service';
import { ProductService } from '../services/product.service';
import { PublicService } from '../services/public.service';

/**
 * Pretraga proizvoda za prijavljenog klijenta.
 *
 * Tekst zadatka: "slično kao i kod neregistrovanog korisnika" - isti uslovi
 * pretrage i isto sortiranje, ali dugme DETALJI vodi na stranu sa proširenim
 * informacijama, a ne na javnu.
 *
 * Zašto zasebna komponenta, a ne ponovna upotreba početne strane: podaci ne
 * dolaze sa iste rute. Javna pretraga namerno ne šalje cenu, opis ni usluge
 * štampe - to su prošireni podaci koje po tekstu zadatka vidi tek prijavljen
 * klijent, pa ih server na javnoj ruti uopšte ne šalje.
 */
@Component({
  selector: 'app-klijent-pretraga',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './klijent-pretraga.html',
  styleUrl: './klijent-pretraga.css',
})
export class KlijentPretraga implements OnInit {
  private servis = inject(ProductService);
  private javni = inject(PublicService);
  private kolacici = inject(CookieService);

  kategorije: string[] = [];

  naziv = '';
  kategorija = 'Sve kategorije';
  smer: 'asc' | 'desc' = 'asc';

  rezultati: Proizvod[] = [];
  poruka = '';
  ucitavanje = false;

  slika = slikaUrl;

  /** Slika proizvoda, uz poštovanje izbora iz galerije (kolačić). */
  slikaProizvoda(id: string, glavna: string): string {
    return slikaUrl(this.kolacici.glavnaSlika(id, glavna));
  }

  ngOnInit(): void {
    // Padajuća lista kategorija je ista kao na javnoj strani: samo one
    // kategorije koje trenutno imaju proizvoda na stanju.
    this.javni.kategorije().subscribe({
      next: (kategorije) => (this.kategorije = kategorije),
    });

    this.pretrazi();
  }

  pretrazi(): void {
    this.ucitavanje = true;

    this.servis.pretrazi(this.naziv.trim(), this.kategorija, this.smer).subscribe({
      next: (rezultati) => {
        this.ucitavanje = false;
        this.rezultati = rezultati;
        this.poruka = rezultati.length ? '' : 'Nema proizvoda koji odgovaraju pretrazi.';
      },
      error: (g) => {
        this.ucitavanje = false;
        this.poruka = g.error?.message ?? 'Pretraga trenutno nije dostupna.';
      },
    });
  }

  /** Klik na zaglavlje kolone menja smer sortiranja i ponavlja pretragu. */
  promeniSmer(): void {
    this.smer = this.smer === 'asc' ? 'desc' : 'asc';
    this.pretrazi();
  }

  ponisti(): void {
    this.naziv = '';
    this.kategorija = 'Sve kategorije';
    this.smer = 'asc';
    this.pretrazi();
  }
}
