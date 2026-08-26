import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Korisnik, StatusKorisnika, TipKorisnika } from '../models/models';
import { AdminService, IzmenaNaloga } from '../services/admin.service';
import { slikaUrl } from '../services/api';
import { AuthService } from '../services/auth.service';

/**
 * Upravljanje korisničkim nalozima: pregled, ažuriranje i brisanje.
 *
 * Izmena se radi u redu tabele koji se "otvori", a ne na posebnoj strani -
 * administrator obično menja jedan podatak (telefon, status), pa bi odlazak na
 * drugu stranu i vraćanje bili sporiji od samog posla.
 */
@Component({
  selector: 'app-admin-korisnici',
  imports: [FormsModule],
  templateUrl: './admin-korisnici.html',
  styleUrl: './admin-korisnici.css',
})
export class AdminKorisnici implements OnInit {
  private servis = inject(AdminService);
  private auth = inject(AuthService);

  private readonly EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  private readonly TELEFON = /^[0-9+\/\s-]{6,20}$/;
  private readonly MATICNI_BROJ = /^[0-9]{8}$/;
  private readonly PIB = /^[1-9][0-9]{8}$/;

  readonly tipovi: { vrednost: TipKorisnika | ''; naziv: string }[] = [
    { vrednost: '', naziv: 'Svi tipovi' },
    { vrednost: 'CLIENT_INDIVIDUAL', naziv: 'Fizičko lice' },
    { vrednost: 'CLIENT_COMPANY', naziv: 'Pravno lice' },
    { vrednost: 'PRINTER', naziv: 'Štamparija' },
    { vrednost: 'ADMIN', naziv: 'Administrator' },
  ];

  readonly statusi: { vrednost: StatusKorisnika | ''; naziv: string }[] = [
    { vrednost: '', naziv: 'Svi statusi' },
    { vrednost: 'PENDING', naziv: 'Na čekanju' },
    { vrednost: 'APPROVED', naziv: 'Odobren' },
    { vrednost: 'REJECTED', naziv: 'Odbijen' },
  ];

  korisnici: Korisnik[] = [];

  pojam = '';
  tip: TipKorisnika | '' = '';
  status: StatusKorisnika | '' = '';

  poruka = '';
  greska = '';
  ucitavanje = true;

  /** Nalog koji se trenutno menja. Prazno znači da nijedan red nije otvoren. */
  uIzmeni: Korisnik | null = null;
  izmena: IzmenaNaloga = this.prazna();
  greske: Record<string, string> = {};
  slanje = false;

  /** Nalog za koji je zatražena potvrda brisanja. */
  zaBrisanje: Korisnik | null = null;

  slika = slikaUrl;

  ngOnInit(): void {
    this.ucitaj();
  }

  private prazna(): IzmenaNaloga {
    return { firstName: '', lastName: '', phone: '', email: '' };
  }

  ucitaj(): void {
    this.ucitavanje = true;
    this.greska = '';

    this.servis.korisnici(this.pojam.trim(), this.tip, this.status).subscribe({
      next: (korisnici) => {
        this.ucitavanje = false;
        this.korisnici = korisnici;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Spisak naloga trenutno nije dostupan.';
      },
    });
  }

  ponisti(): void {
    this.pojam = '';
    this.tip = '';
    this.status = '';
    this.ucitaj();
  }

  // --- prikaz ---------------------------------------------------------------

  nazivTipa(tip: TipKorisnika): string {
    return this.tipovi.find((t) => t.vrednost === tip)?.naziv ?? tip;
  }

  nazivStatusa(status: StatusKorisnika): string {
    return this.statusi.find((s) => s.vrednost === status)?.naziv ?? status;
  }

  bojaTipa(tip: TipKorisnika): string {
    switch (tip) {
      case 'PRINTER':
        return 'var(--cijan)';
      case 'CLIENT_COMPANY':
        return 'var(--magenta)';
      case 'ADMIN':
        return 'var(--crvena-zemlja)';
      default:
        return 'var(--mastilo-blago)';
    }
  }

  bojaStatusa(status: StatusKorisnika): string {
    if (status === 'APPROVED') return 'var(--cijan)';
    if (status === 'REJECTED') return 'var(--crvena-zemlja)';
    return 'var(--mastilo-blago)';
  }

  jeInstitucija(korisnik: Korisnik): boolean {
    return korisnik.type === 'CLIENT_COMPANY' || korisnik.type === 'PRINTER';
  }

  /** Nalog kojim je administrator prijavljen ne sme da se obriše. */
  jeSopstveni(korisnik: Korisnik): boolean {
    return this.auth.korisnik()?._id === korisnik._id;
  }

  // --- izmena ---------------------------------------------------------------

  otvoriIzmenu(korisnik: Korisnik): void {
    this.zaBrisanje = null;
    this.greske = {};
    this.poruka = '';
    this.greska = '';

    this.uIzmeni = korisnik;
    this.izmena = {
      firstName: korisnik.firstName,
      lastName: korisnik.lastName,
      phone: korisnik.phone,
      email: korisnik.email,
      status: korisnik.status,
      institutionName: korisnik.institution?.name ?? '',
      institutionAddress: korisnik.institution?.address ?? '',
      institutionCity: korisnik.institution?.city ?? '',
      registrationNumber: korisnik.institution?.registrationNumber ?? '',
      taxId: korisnik.institution?.taxId ?? '',
    };
  }

  zatvoriIzmenu(): void {
    this.uIzmeni = null;
    this.izmena = this.prazna();
    this.greske = {};
  }

  private proveri(jeInstitucija: boolean): boolean {
    const nadjene: Record<string, string> = {};

    if (!this.izmena.firstName.trim()) nadjene['firstName'] = 'Ime je obavezno polje.';
    if (!this.izmena.lastName.trim()) nadjene['lastName'] = 'Prezime je obavezno polje.';

    if (!this.TELEFON.test(this.izmena.phone.trim())) {
      nadjene['phone'] = 'Telefon nije u ispravnom formatu.';
    }
    if (!this.EMAIL.test(this.izmena.email.trim())) {
      nadjene['email'] = 'I-mejl adresa nije u ispravnom formatu.';
    }

    if (jeInstitucija) {
      if (!this.izmena.institutionName?.trim()) {
        nadjene['institutionName'] = 'Naziv institucije je obavezno polje.';
      }
      if (!this.izmena.institutionAddress?.trim()) {
        nadjene['institutionAddress'] = 'Adresa je obavezno polje.';
      }
      if (!this.izmena.institutionCity?.trim()) {
        nadjene['institutionCity'] = 'Grad je obavezno polje.';
      }
      if (!this.MATICNI_BROJ.test(this.izmena.registrationNumber?.trim() ?? '')) {
        nadjene['registrationNumber'] = 'Matični broj mora imati tačno 8 cifara.';
      }
      if (!this.PIB.test(this.izmena.taxId?.trim() ?? '')) {
        nadjene['taxId'] = 'PIB mora imati 9 cifara i ne sme početi nulom.';
      }
    }

    this.greske = nadjene;
    return Object.keys(nadjene).length === 0;
  }

  sacuvaj(): void {
    if (!this.uIzmeni) return;

    this.poruka = '';
    this.greska = '';

    if (!this.proveri(this.jeInstitucija(this.uIzmeni))) return;

    this.slanje = true;
    this.servis.izmeniKorisnika(this.uIzmeni._id, this.izmena).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;

        // Izmenjeni nalog se zamenjuje u mestu - tabela ostaje na istom mestu,
        // umesto da se ceo spisak ponovo učitava i skoči na vrh.
        const mesto = this.korisnici.findIndex((k) => k._id === odgovor.user._id);
        if (mesto >= 0) this.korisnici[mesto] = odgovor.user;

        this.zatvoriIzmenu();
      },
      error: (g) => {
        this.slanje = false;
        const nadjene: Record<string, string> = {};
        for (const greska of g.error?.errors ?? []) nadjene[greska.field] = greska.message;
        this.greske = nadjene;

        if (!Object.keys(nadjene).length) {
          this.greska = g.error?.message ?? 'Izmena nije uspela.';
        }
      },
    });
  }

  // --- brisanje -------------------------------------------------------------

  /**
   * Brisanje ide u dva koraka. Kod štamparije se uz nalog brišu i njeni
   * proizvodi, pa korisnik pre potvrde mora da vidi šta tačno nestaje.
   */
  potvrdiBrisanje(korisnik: Korisnik): void {
    this.zatvoriIzmenu();
    this.poruka = '';
    this.greska = '';
    this.zaBrisanje = korisnik;
  }

  odustaniOdBrisanja(): void {
    this.zaBrisanje = null;
  }

  obrisi(): void {
    if (!this.zaBrisanje) return;

    const id = this.zaBrisanje._id;
    this.slanje = true;

    this.servis.obrisiKorisnika(id).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.korisnici = this.korisnici.filter((k) => k._id !== id);
        this.zaBrisanje = null;
      },
      error: (g) => {
        this.slanje = false;
        this.greska = g.error?.message ?? 'Brisanje nije uspelo.';
        this.zaBrisanje = null;
      },
    });
  }
}
