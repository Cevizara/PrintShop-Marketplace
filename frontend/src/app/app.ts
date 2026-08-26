import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Okvir aplikacije.
 *
 * Tekst zadatka trazi da svaka veb strana ima meni, zaglavlje i podnozje, kao
 * i link za odjavu. Zato su ovde, u komponenti koja obavija sve rute, a ne u
 * svakoj strani posebno.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  auth = inject(AuthService);

  get godina(): number {
    return new Date().getFullYear();
  }

  odjava(): void {
    this.auth.odjava();
  }
}
