import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OdgovorResetLinka } from '../models/models';
import { AuthService } from '../services/auth.service';

/**
 * Zaboravljena lozinka, korak 1.
 *
 * Korisnik unosi korisničko ime ili i-mejl adresu i odmah dobija privremeni
 * veb link. Tekst zadatka: "korisnik može uneti svoje korisničko ime ili
 * i-mejl adresu, čime dobija veb link za poništavanje lozinke".
 */
@Component({
  selector: 'app-zaboravljena-lozinka',
  imports: [FormsModule, RouterLink],
  templateUrl: './zaboravljena-lozinka.html',
})
export class ZaboravljenaLozinka {
  private auth = inject(AuthService);

  podatak = '';
  odgovor: OdgovorResetLinka | null = null;
  greska = '';
  slanje = false;
  kopirano = false;

  posalji(): void {
    this.greska = '';
    this.odgovor = null;
    this.kopirano = false;

    if (!this.podatak.trim()) {
      this.greska = 'Unesite korisničko ime ili i-mejl adresu.';
      return;
    }

    this.slanje = true;
    this.auth.zatraziLinkZaLozinku(this.podatak.trim()).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.odgovor = odgovor;
      },
      error: (greska) => {
        this.slanje = false;
        this.greska = greska.error?.message ?? 'Zahtev nije uspeo.';
      },
    });
  }

  /** Rok trajanja linka, ispisan kao vreme. */
  get istice(): string {
    if (!this.odgovor) return '';
    return new Date(this.odgovor.expiresAt).toLocaleTimeString('sr-RS');
  }

  kopiraj(): void {
    if (!this.odgovor) return;
    navigator.clipboard.writeText(this.odgovor.link).then(() => (this.kopirano = true));
  }
}
