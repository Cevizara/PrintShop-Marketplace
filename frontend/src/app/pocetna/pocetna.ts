import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PodaciPocetne, RezultatPretrage } from '../models/models';
import { slikaUrl } from '../services/api';
import { PublicService } from '../services/public.service';

/**
 * Početna strana za neregistrovanog korisnika:
 * ukupan broj štamparija, TOP 5 proizvoda po broju sviđanja, i pretraga po
 * nazivu i/ili kategoriji sa abecednim sortiranjem rezultata.
 */
@Component({
  selector: 'app-pocetna',
  imports: [FormsModule, RouterLink],
  templateUrl: './pocetna.html',
  styleUrl: './pocetna.css',
})
export class Pocetna implements OnInit {
  private servis = inject(PublicService);

  podaci: PodaciPocetne | null = null;
  kategorije: string[] = [];

  naziv = '';
  kategorija = 'Sve kategorije';
  smer: 'asc' | 'desc' = 'asc';

  rezultati: RezultatPretrage[] = [];
  pretrazeno = false;
  poruka = '';
  ucitavanje = false;

  slika = slikaUrl;

  ngOnInit(): void {
    this.servis.pocetna().subscribe({
      next: (podaci) => (this.podaci = podaci),
      error: () =>
        (this.poruka =
          'Podaci sa početne strane trenutno nisu dostupni. Proverite da li server radi.'),
    });

    this.servis.kategorije().subscribe({
      next: (kategorije) => (this.kategorije = kategorije),
    });

    // Prvo učitavanje prikazuje celu ponudu, da strana ne bude prazna.
    this.pretrazi();
  }

  pretrazi(): void {
    this.ucitavanje = true;

    this.servis.pretrazi(this.naziv.trim(), this.kategorija, this.smer).subscribe({
      next: (rezultati) => {
        this.ucitavanje = false;
        this.rezultati = rezultati;
        this.pretrazeno = true;
        this.poruka = rezultati.length ? '' : 'Nema proizvoda koji odgovaraju pretrazi.';
      },
      error: () => {
        this.ucitavanje = false;
        this.poruka = 'Pretraga trenutno nije dostupna.';
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
