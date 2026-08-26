import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Korisnik, TipKorisnika } from '../models/models';
import { slikaUrl } from '../services/api';
import { AdminService } from '../services/admin.service';

/**
 * Obrada zahteva za registraciju: poseban tabelarni pregled svih neodobrenih
 * korisnika, sa prihvatanjem ili odbacivanjem.
 *
 * Zahtevi nisu zasebna kolekcija - to su korisnici sa statusom PENDING.
 */
@Component({
  selector: 'app-admin-zahtevi',
  imports: [DatePipe],
  templateUrl: './admin-zahtevi.html',
})
export class AdminZahtevi implements OnInit {
  private servis = inject(AdminService);

  zahtevi: Korisnik[] = [];
  poruka = '';
  greska = '';
  ucitavanje = true;
  /** ID zahteva koji se trenutno obrađuje - da se dugmad ne kliknu dvaput. */
  uObradi = '';

  slika = slikaUrl;

  ngOnInit(): void {
    this.ucitaj();
  }

  private ucitaj(): void {
    this.ucitavanje = true;

    this.servis.zahteviZaRegistraciju().subscribe({
      next: (zahtevi) => {
        this.ucitavanje = false;
        this.zahtevi = zahtevi;
      },
      error: (greska) => {
        this.ucitavanje = false;
        this.greska = greska.error?.message ?? 'Zahtevi trenutno nisu dostupni.';
      },
    });
  }

  nazivTipa(tip: TipKorisnika): string {
    switch (tip) {
      case 'CLIENT_INDIVIDUAL':
        return 'Fizičko lice';
      case 'CLIENT_COMPANY':
        return 'Pravno lice';
      case 'PRINTER':
        return 'Štamparija';
      default:
        return 'Administrator';
    }
  }

  bojaTipa(tip: TipKorisnika): string {
    switch (tip) {
      case 'CLIENT_INDIVIDUAL':
        return '#8A6A00';
      case 'CLIENT_COMPANY':
        return '#9B0050';
      default:
        return '#00778F';
    }
  }

  odluci(korisnik: Korisnik, prihvati: boolean): void {
    this.poruka = '';
    this.greska = '';
    this.uObradi = korisnik._id;

    this.servis.obradiZahtev(korisnik._id, prihvati).subscribe({
      next: (odgovor) => {
        this.uObradi = '';
        this.poruka = odgovor.message;
        // Red se sklanja odmah, bez ponovnog učitavanja cele tabele.
        this.zahtevi = this.zahtevi.filter((z) => z._id !== korisnik._id);
      },
      error: (greska) => {
        this.uObradi = '';
        this.greska = greska.error?.message ?? 'Obrada zahteva nije uspela.';
      },
    });
  }
}
