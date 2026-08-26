import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Kategorija } from '../models/models';
import { AdminService } from '../services/admin.service';

/**
 * Upravljanje kategorijama štamparskih proizvoda.
 *
 * Tekst zadatka o administratoru kaže samo: "Može dodati novu kategoriju i
 * unutar nje isto to za potkategorije." Preimenovanja i brisanja zato nema, i
 * to je odluka a ne propust: naziv kategorije se čuva i na proizvodu, pa bi
 * preimenovanje moralo da ažurira i sve proizvode, a brisanje bi ostavilo
 * proizvode koji pokazuju na kategoriju koje nema.
 */
@Component({
  selector: 'app-admin-kategorije',
  imports: [FormsModule],
  templateUrl: './admin-kategorije.html',
  styleUrl: './admin-kategorije.css',
})
export class AdminKategorije implements OnInit {
  private servis = inject(AdminService);

  kategorije: Kategorija[] = [];

  novaKategorija = '';
  greskaKategorije = '';

  /** Kategorija u koju se trenutno dodaje potkategorija. */
  uDodavanju: Kategorija | null = null;
  novaPotkategorija = '';
  greskaPotkategorije = '';

  poruka = '';
  greska = '';
  ucitavanje = true;
  slanje = false;

  ngOnInit(): void {
    this.ucitaj();
  }

  private ucitaj(): void {
    this.ucitavanje = true;

    this.servis.kategorijeSaBrojem().subscribe({
      next: (kategorije) => {
        this.ucitavanje = false;
        this.kategorije = kategorije;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Spisak kategorija trenutno nije dostupan.';
      },
    });
  }

  private ocisti(): void {
    this.poruka = '';
    this.greska = '';
    this.greskaKategorije = '';
    this.greskaPotkategorije = '';
  }

  // --- kategorija -----------------------------------------------------------

  dodajKategoriju(): void {
    this.ocisti();

    const naziv = this.novaKategorija.trim();
    if (!naziv) {
      this.greskaKategorije = 'Unesite naziv kategorije.';
      return;
    }

    this.slanje = true;
    this.servis.dodajKategoriju(naziv).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.novaKategorija = '';

        // Nova kategorija se ubacuje na svoje abecedno mesto, umesto da se ceo
        // spisak ponovo učitava sa servera.
        this.kategorije = [...this.kategorije, { ...odgovor.category, productCount: 0 }].sort(
          (a, b) => a.name.localeCompare(b.name, 'sr')
        );
      },
      error: (g) => {
        this.slanje = false;
        this.greskaKategorije = g.error?.errors?.[0]?.message ?? g.error?.message ?? 'Dodavanje nije uspelo.';
      },
    });
  }

  // --- potkategorija --------------------------------------------------------

  otvoriDodavanje(kategorija: Kategorija): void {
    this.ocisti();
    this.uDodavanju = this.uDodavanju?._id === kategorija._id ? null : kategorija;
    this.novaPotkategorija = '';
  }

  dodajPotkategoriju(): void {
    if (!this.uDodavanju) return;

    this.ocisti();

    const naziv = this.novaPotkategorija.trim();
    if (!naziv) {
      this.greskaPotkategorije = 'Unesite naziv potkategorije.';
      return;
    }

    const id = this.uDodavanju._id;
    this.slanje = true;

    this.servis.dodajPotkategoriju(id, naziv).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.novaPotkategorija = '';

        const mesto = this.kategorije.findIndex((k) => k._id === id);
        if (mesto >= 0) {
          // Broj proizvoda ne stiže uz odgovor, pa se prenosi iz starog zapisa.
          this.kategorije[mesto] = {
            ...odgovor.category,
            productCount: this.kategorije[mesto].productCount,
          };
          this.uDodavanju = this.kategorije[mesto];
        }
      },
      error: (g) => {
        this.slanje = false;
        this.greskaPotkategorije =
          g.error?.errors?.[0]?.message ?? g.error?.message ?? 'Dodavanje nije uspelo.';
      },
    });
  }
}
