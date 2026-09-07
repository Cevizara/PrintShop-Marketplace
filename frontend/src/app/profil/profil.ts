import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KlijentNarudzbine } from '../klijent-narudzbine/klijent-narudzbine';
import { Korisnik } from '../models/models';
import { slikaUrl } from '../services/api';
import { AuthService } from '../services/auth.service';
import { PodaciProfila, UserService } from '../services/user.service';

/**
 * Profil prijavljenog korisnika: pregled i ažuriranje ličnih podataka.
 *
 * Jedna strana za sve uloge. Tekst zadatka traži profil i za klijente i za
 * štampare, sa istim opisom - razlika je samo u tome što pravno lice i
 * štamparija imaju i podatke o instituciji. To je isti odnos kao na
 * registraciji, pa se rešava istim uslovom, a ne drugom stranom.
 *
 * Korisničko ime se prikazuje ali se NE menja - tako traži tekst zadatka.
 * Polje je zato onemogućeno, a server ga i ne čita iz zahteva.
 *
 * Ispod obrasca stoji i tabela narudžbina, jer je tekst zadatka traži baš tu:
 * „испод табеле са личним подацима". Ranije je bila zasebna strana. Tabela je
 * ostala u svojoj komponenti - vidi `KlijentNarudzbine`.
 */
@Component({
  selector: 'app-profil',
  imports: [DatePipe, FormsModule, KlijentNarudzbine],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
})
export class Profil implements OnInit {
  private servis = inject(UserService);
  private auth = inject(AuthService);

  // Isti izrazi kao na serveru. Ako se menja jedan, mora i drugi.
  private readonly EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  private readonly TELEFON = /^[0-9+\/\s-]{6,20}$/;
  private readonly MATICNI_BROJ = /^[0-9]{8}$/;
  private readonly PIB = /^[1-9][0-9]{8}$/;

  korisnik: Korisnik | null = null;

  ime = '';
  prezime = '';
  telefon = '';
  email = '';
  nazivInstitucije = '';
  adresa = '';
  grad = '';
  maticniBroj = '';
  pib = '';
  lat = '';
  lng = '';

  greske: Record<string, string> = {};
  poruka = '';
  uspeh = '';
  ucitavanje = true;
  slanje = false;

  // promena slike
  novaSlika: File | null = null;
  imeSlike = '';
  slanjeSlike = false;

  slika = slikaUrl;

  get jeInstitucija(): boolean {
    return this.korisnik?.type === 'CLIENT_COMPANY' || this.korisnik?.type === 'PRINTER';
  }

  /** Koordinate unosi samo štampar - služe mapi na strani sa detaljima. */
  get jeStampar(): boolean {
    return this.korisnik?.type === 'PRINTER';
  }

  get nazivTipa(): string {
    switch (this.korisnik?.type) {
      case 'CLIENT_INDIVIDUAL':
        return 'Klijent — fizičko lice';
      case 'CLIENT_COMPANY':
        return 'Klijent — pravno lice';
      case 'PRINTER':
        return 'Štamparija';
      case 'ADMIN':
        return 'Administrator sistema';
      default:
        return '';
    }
  }

  get naslovDrugogOdeljka(): string {
    return this.jeInstitucija ? 'Odgovorno lice' : 'Lični podaci';
  }

  /**
   * Tabelu narudžbina ispod ličnih podataka vide samo klijenti.
   *
   * Štampar svoje narudžbine ima na svojoj strani, sa drugim dugmadima —
   * on menja status, a ne otkazuje. Administrator narudžbine nema uopšte.
   */
  get jeKlijent(): boolean {
    return (
      this.korisnik?.type === 'CLIENT_INDIVIDUAL' || this.korisnik?.type === 'CLIENT_COMPANY'
    );
  }

  /**
   * Redni broj odeljka sa narudžbinama, rimskim brojem kao i ostali.
   *
   * Računa se, a ne piše kao konstanta: pravno lice iznad ima i odeljak sa
   * podacima o instituciji, a fizičko lice nema — pa narudžbine kod jednog
   * dolaze četvrte, a kod drugog treće.
   */
  get brojOdeljkaNarudzbina(): string {
    return this.jeInstitucija ? 'IV' : 'III';
  }

  ngOnInit(): void {
    this.servis.mojProfil().subscribe({
      next: (korisnik) => {
        this.ucitavanje = false;
        this.popuni(korisnik);
      },
      error: () => {
        this.ucitavanje = false;
        this.poruka = 'Podaci profila trenutno nisu dostupni.';
      },
    });
  }

  private popuni(korisnik: Korisnik): void {
    this.korisnik = korisnik;
    this.ime = korisnik.firstName;
    this.prezime = korisnik.lastName;
    this.telefon = korisnik.phone;
    this.email = korisnik.email;

    this.nazivInstitucije = korisnik.institution?.name ?? '';
    this.adresa = korisnik.institution?.address ?? '';
    this.grad = korisnik.institution?.city ?? '';
    this.maticniBroj = korisnik.institution?.registrationNumber ?? '';
    this.pib = korisnik.institution?.taxId ?? '';
    this.lat = korisnik.institution?.lat?.toString() ?? '';
    this.lng = korisnik.institution?.lng?.toString() ?? '';
  }

  // --- čuvanje podataka -----------------------------------------------------

  private proveri(): boolean {
    const nadjene: Record<string, string> = {};

    if (!this.ime.trim()) nadjene['firstName'] = 'Ime je obavezno polje.';
    if (!this.prezime.trim()) nadjene['lastName'] = 'Prezime je obavezno polje.';

    if (!this.telefon.trim()) {
      nadjene['phone'] = 'Kontakt telefon je obavezno polje.';
    } else if (!this.TELEFON.test(this.telefon.trim())) {
      nadjene['phone'] = 'Telefon nije u ispravnom formatu.';
    }

    if (!this.email.trim()) {
      nadjene['email'] = 'I-mejl adresa je obavezno polje.';
    } else if (!this.EMAIL.test(this.email.trim())) {
      nadjene['email'] = 'I-mejl adresa nije u ispravnom formatu.';
    }

    if (this.jeInstitucija) {
      if (!this.nazivInstitucije.trim()) {
        nadjene['institutionName'] = 'Naziv institucije je obavezno polje.';
      }
      if (!this.adresa.trim()) nadjene['institutionAddress'] = 'Adresa sedišta je obavezno polje.';
      if (!this.grad.trim()) nadjene['institutionCity'] = 'Grad je obavezno polje.';

      if (!this.MATICNI_BROJ.test(this.maticniBroj.trim())) {
        nadjene['registrationNumber'] = 'Matični broj mora imati tačno 8 cifara.';
      }
      if (!this.PIB.test(this.pib.trim())) {
        nadjene['taxId'] = 'PIB mora imati 9 cifara i ne sme početi nulom.';
      }
    }

    this.greske = nadjene;
    return Object.keys(nadjene).length === 0;
  }

  sacuvaj(): void {
    this.poruka = '';
    this.uspeh = '';

    if (!this.proveri()) return;

    const podaci: PodaciProfila = {
      firstName: this.ime.trim(),
      lastName: this.prezime.trim(),
      phone: this.telefon.trim(),
      email: this.email.trim(),
    };

    if (this.jeInstitucija) {
      podaci.institutionName = this.nazivInstitucije.trim();
      podaci.institutionAddress = this.adresa.trim();
      podaci.institutionCity = this.grad.trim();
      podaci.registrationNumber = this.maticniBroj.trim();
      podaci.taxId = this.pib.trim();
    }

    if (this.jeStampar) {
      podaci.lat = this.lat.trim();
      podaci.lng = this.lng.trim();
    }

    this.slanje = true;
    this.servis.sacuvajProfil(podaci).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.uspeh = odgovor.message;
        this.popuni(odgovor.user);
        // Ime u zaglavlju se čita iz zapamćene sesije, pa se i ona osvežava.
        this.auth.osveziKorisnika(odgovor.user);
      },
      error: (greska) => {
        this.slanje = false;
        const nadjene: Record<string, string> = {};
        for (const g of greska.error?.errors ?? []) nadjene[g.field] = g.message;
        this.greske = nadjene;

        if (!Object.keys(nadjene).length) {
          this.poruka = greska.error?.message ?? 'Čuvanje nije uspelo.';
        }
      },
    });
  }

  // --- profilna slika -------------------------------------------------------

  /**
   * Provera u pregledaču: format i dimenzije 100x100 do 250x250 px.
   * Dimenzije se znaju tek kad se slika učita, pa je provera asinhrona.
   * Ista provera postoji i na serveru - ova je samo radi brže poruke.
   */
  izabranaSlika(dogadjaj: Event): void {
    const polje = dogadjaj.target as HTMLInputElement;
    const fajl = polje.files?.[0];

    delete this.greske['profileImage'];
    this.novaSlika = null;
    this.imeSlike = '';

    if (!fajl) return;

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(fajl.type)) {
      this.greske['profileImage'] = 'Dozvoljeni su samo JPG, PNG i GIF formati.';
      polje.value = '';
      return;
    }

    const slika = new Image();
    const adresa = URL.createObjectURL(fajl);

    slika.onload = () => {
      const { naturalWidth: sirina, naturalHeight: visina } = slika;

      if (sirina < 100 || visina < 100 || sirina > 250 || visina > 250) {
        this.greske['profileImage'] =
          `Slika mora biti između 100x100 i 250x250 piksela. Izabrana je ${sirina}x${visina}.`;
      } else {
        this.novaSlika = fajl;
        this.imeSlike = `${fajl.name} (${sirina}x${visina})`;
      }

      URL.revokeObjectURL(adresa);
    };

    slika.onerror = () => {
      this.greske['profileImage'] = 'Izabrani fajl nije ispravna slika.';
      URL.revokeObjectURL(adresa);
    };

    slika.src = adresa;
  }

  posaljiSliku(): void {
    if (!this.novaSlika) return;

    this.poruka = '';
    this.uspeh = '';
    this.slanjeSlike = true;

    this.servis.promeniSliku(this.novaSlika).subscribe({
      next: (odgovor) => {
        this.slanjeSlike = false;
        this.novaSlika = null;
        this.imeSlike = '';
        this.uspeh = odgovor.message;
        this.popuni(odgovor.user);
        this.auth.osveziKorisnika(odgovor.user);
      },
      error: (greska) => {
        this.slanjeSlike = false;
        const prva = greska.error?.errors?.[0];
        if (prva) {
          this.greske['profileImage'] = prva.message;
        } else {
          this.poruka = greska.error?.message ?? 'Promena slike nije uspela.';
        }
      },
    });
  }
}
