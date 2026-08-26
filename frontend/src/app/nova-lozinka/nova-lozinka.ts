import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Zaboravljena lozinka, korak 2: postavljanje nove lozinke preko privremenog
 * linka.
 *
 * Ispravnost i rok trajanja tokena proverava server - i pri otvaranju strane,
 * i ponovo pri slanju nove lozinke. Ovde se samo prikazuje rezultat te provere.
 */
@Component({
  selector: 'app-nova-lozinka',
  imports: [FormsModule, RouterLink],
  templateUrl: './nova-lozinka.html',
})
export class NovaLozinka implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly LOZINKA = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/;

  token = '';
  /** null dok traje provera, pa true ili false. */
  ispravan: boolean | null = null;

  lozinka = '';
  potvrda = '';

  greska = '';
  uspeh = '';
  slanje = false;

  ngOnInit(): void {
    this.token = String(this.route.snapshot.paramMap.get('token'));

    this.auth.proveriLink(this.token).subscribe({
      next: (odgovor) => (this.ispravan = odgovor.valid),
      error: (greska) => {
        this.ispravan = false;
        this.greska = greska.error?.message ?? 'Link je istekao ili je već iskorišćen.';
      },
    });
  }

  posalji(): void {
    this.greska = '';
    this.uspeh = '';

    if (!this.LOZINKA.test(this.lozinka)) {
      this.greska =
        'Lozinka mora imati 8-12 karaktera, počinjati slovom i sadržati veliko slovo, ' +
        'broj i specijalni znak.';
      return;
    }

    if (this.lozinka !== this.potvrda) {
      this.greska = 'Lozinke se ne poklapaju.';
      return;
    }

    this.slanje = true;
    this.auth.postaviNovuLozinku(this.token, this.lozinka).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.uspeh = odgovor.message;
        setTimeout(() => this.router.navigate(['/pristup']), 2500);
      },
      error: (greska) => {
        this.slanje = false;
        this.greska = greska.error?.message ?? 'Promena lozinke nije uspela.';
      },
    });
  }
}
