import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PodaciPocetne, RezultatPretrage } from '../models/models';
import { slikaUrl } from '../services/api';
import { CookieService } from '../services/cookie.service';
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
  private kolacici = inject(CookieService);

  podaci: PodaciPocetne | null = null;
  kategorije: string[] = [];

  naziv = '';
  kategorija = 'Sve kategorije';
  smer: 'asc' | 'desc' = 'asc';

  rezultati: RezultatPretrage[] = [];
  pretrazeno = false;
  poruka = '';
  ucitavanje = false;

  /**
   * Ukupan broj proizvoda na stanju, za uvodnu traku.
   *
   * Ne traži se posebno sa servera: pretraga bez ijednog filtera ionako vraća
   * celu ponudu, pa se broj čita odatle. Zato se i upisuje samo kada je
   * pretraga bila bez filtera — inače bi posle svake pretrage pisalo koliko je
   * poslednji rezultat imao redova, a traka govori o veličini ponude.
   *
   * `null` znači „još nije stiglo"; traka tada tu brojku ne prikazuje uopšte,
   * jer bi 0 bila netačna.
   */
  ukupnoProizvoda: number | null = null;

  slika = slikaUrl;

  /** Vodeća nula: na radnom nalogu se „3" piše kao „03". Veći brojevi se ne diraju. */
  dveCifre(broj: number): string {
    return String(broj).padStart(2, '0');
  }

  /**
   * Slika proizvoda, uz poštovanje izbora iz galerije.
   * Ako je posetilac na strani sa detaljima izabrao drugu sliku, ona je od tada
   * glavna za taj proizvod — i ovde, ne samo tamo gde je izabrana.
   */
  slikaProizvoda(id: string, glavna: string): string {
    return slikaUrl(this.kolacici.glavnaSlika(id, glavna));
  }

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

    // Vrednosti se hvataju pre slanja, a ne čitaju iz polja kad odgovor stigne:
    // korisnik u međuvremenu može da otkuca nešto drugo, pa bi se odgovor na
    // praznu pretragu upisao kao da je bio filtriran.
    const naziv = this.naziv.trim();
    const kategorija = this.kategorija;

    this.servis.pretrazi(naziv, kategorija, this.smer).subscribe({
      next: (rezultati) => {
        this.ucitavanje = false;
        this.rezultati = rezultati;
        this.pretrazeno = true;
        this.poruka = rezultati.length ? '' : 'Nema proizvoda koji odgovaraju pretrazi.';

        // Cela ponuda se vidi samo kada nema nijednog filtera. Tada — i samo
        // tada — ovaj broj znači „proizvoda na stanju".
        if (!naziv && kategorija === 'Sve kategorije') {
          this.ukupnoProizvoda = rezultati.length;
        }
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
