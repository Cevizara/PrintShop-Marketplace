import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Prijava korisnika - klijenti i štampari.
 *
 * Ranije je prijava delila komponentu sa registracijom, a prelazilo se
 * dugmadima na ploči štampača, bez promene adrese. To je bilo pogrešno: adresa
 * je govorila jedno, a strana prikazivala drugo, i povratak u pregledaču nije
 * radio ono što korisnik očekuje. Sada je svaki obrazac svoja ruta i svoja
 * komponenta, a prelazi se linkom, koji stvarno menja adresu.
 *
 * Administrator se ovde ne prijavljuje - on ima svoju rutu /admin/prijava.
 */
@Component({
  selector: 'app-prijava',
  imports: [FormsModule, RouterLink],
  templateUrl: './prijava.html',
})
export class Prijava implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  korisnickoIme = '';
  lozinka = '';

  poruka = '';
  slanje = false;

  /**
   * Papir je na početku uvučen, pa ga otvaramo tek posle prvog iscrtavanja.
   * Da je odmah otvoren, pregledač ne bi imao između čega da animira i list bi
   * jednostavno bio tu - a izlazak lista iz štampača je cela zamisao ove strane.
   */
  otvoren = false;

  /**
   * Objašnjenje zašto ste ovde, ako niste sami došli.
   * Postavlja ga interceptor kada server odbije istekao token.
   */
  porukaSesije = '';

  ngOnInit(): void {
    setTimeout(() => (this.otvoren = true));

    // Čita se jednom i odmah briše: poruka važi za ovaj dolazak na stranu, a
    // ne bi trebalo da stoji i kada se kasnije vratite svojom voljom.
    this.porukaSesije = this.auth.porukaSesije();
    this.auth.porukaSesije.set('');
  }

  posaljiPrijavu(): void {
    this.poruka = '';

    if (!this.korisnickoIme.trim() || !this.lozinka) {
      this.poruka = 'Unesite korisničko ime i lozinku.';
      return;
    }

    this.slanje = true;
    this.auth.prijava(this.korisnickoIme.trim(), this.lozinka).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.auth.zapamtiSesiju(odgovor);
        this.router.navigate([this.auth.pocetnaRutaZa(odgovor.user.type)]);
      },
      error: (greska) => {
        this.slanje = false;
        // Server namerno vraća istu poruku za nepostojećeg korisnika i za
        // pogrešnu lozinku, da se ne otkriva koja imena postoje.
        this.poruka = greska.error?.message ?? 'Prijava nije uspela.';
      },
    });
  }
}
