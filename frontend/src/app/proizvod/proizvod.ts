import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JavniDetalji } from '../models/models';
import { slikaUrl } from '../services/api';
import { AuthService } from '../services/auth.service';
import { CookieService } from '../services/cookie.service';
import { PublicService } from '../services/public.service';

/**
 * Detalji proizvoda za neregistrovanog korisnika: naziv, štamparija, grad,
 * broj sviđanja i nesviđanja, i galerija.
 *
 * Cenu, opis i usluge štampe server na ovoj ruti uopšte ne šalje - to su
 * "proširene informacije" koje po tekstu zadatka vidi tek prijavljeni klijent.
 */
@Component({
  selector: 'app-proizvod',
  imports: [RouterLink],
  templateUrl: './proizvod.html',
  styleUrl: './proizvod.css',
})
export class Proizvod implements OnInit {
  private servis = inject(PublicService);
  private route = inject(ActivatedRoute);
  private kolacici = inject(CookieService);
  private auth = inject(AuthService);

  proizvod: JavniDetalji | null = null;
  prikazana = '';
  poruka = '';

  slika = slikaUrl;

  /**
   * Ova strana je javna, ali je otvara i prijavljen korisnik — dođe do nje iz
   * pretrage na početnoj ili preko sačuvanog linka. Zato ponuda ispod spiska
   * zavisi od toga ko gleda: gostu prijava, klijentu prečica na prošireni
   * karton, štamparu i administratoru ništa.
   *
   * Ovo je samo prikaz. Sadržaj same strane ne zavisi od ovoga — server na
   * javnoj ruti cenu i usluge štampe ionako ne šalje nikome.
   */
  get jeKlijent(): boolean {
    return this.auth.jeTipa('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY');
  }

  get prijavljen(): boolean {
    return this.auth.prijavljen;
  }

  ngOnInit(): void {
    const id = String(this.route.snapshot.paramMap.get('id'));

    this.servis.detalji(id).subscribe({
      next: (podaci) => {
        this.proizvod = podaci;

        // Tekst zadatka: izabrana slika iz galerije pamti se u KOLAČIĆU tog
        // veb pregledača, i pri sledećem otvaranju ona je glavna.
        const zapamcena = this.kolacici.zapamcenaSlika(id);
        this.prikazana =
          zapamcena && this.sveSlike.includes(zapamcena) ? zapamcena : podaci.mainImage;
      },
      error: (greska) =>
        (this.poruka = greska.error?.message ?? 'Proizvod nije pronađen.'),
    });
  }

  get sveSlike(): string[] {
    if (!this.proizvod) return [];
    return [this.proizvod.mainImage, ...this.proizvod.additionalImages];
  }

  /** Klik na sličicu: postaje glavna slika i pamti se u kolačiću. */
  izaberi(putanja: string): void {
    this.prikazana = putanja;
    if (this.proizvod) {
      this.kolacici.zapamtiSliku(this.proizvod._id, putanja);
    }
  }
}
