import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Prijava administratora.
 *
 * Tekst zadatka traži drugu formu, sa istim poljima, koja NIJE javno vidljiva
 * i stoji na posebnoj ruti. Zato ova strana nema meni koji vodi ka njoj i
 * nigde nije povezana linkom sa javnog dela sajta.
 *
 * Suštinska razlika je na serveru: poziv ide na /auth/admin/login, koji
 * prihvata isključivo naloge tipa ADMIN. Da su oba isti endpoint, "posebna
 * ruta" bi bila samo kozmetika.
 */
@Component({
  selector: 'app-admin-prijava',
  imports: [FormsModule],
  templateUrl: './admin-prijava.html',
  styleUrl: './admin-prijava.css',
})
export class AdminPrijava {
  private auth = inject(AuthService);
  private router = inject(Router);

  korisnickoIme = '';
  lozinka = '';
  poruka = '';
  slanje = false;

  prijava(): void {
    this.poruka = '';

    if (!this.korisnickoIme.trim() || !this.lozinka) {
      this.poruka = 'Unesite korisničko ime i lozinku.';
      return;
    }

    this.slanje = true;
    this.auth.prijavaAdministratora(this.korisnickoIme.trim(), this.lozinka).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.auth.zapamtiSesiju(odgovor);
        this.router.navigate(['/admin/zahtevi']);
      },
      error: (greska) => {
        this.slanje = false;
        this.poruka = greska.error?.message ?? 'Prijava nije uspela.';
      },
    });
  }
}
