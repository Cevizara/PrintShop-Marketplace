import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TipKorisnika } from '../models/models';
import { AuthService } from '../services/auth.service';

/**
 * prijava      - papir sa obrascem za prijavu
 * tip          - bira se tip korisnika, papir je uvucen
 * registracija - papir sa obrascem za registraciju izabranog tipa
 *
 * Nema praznog pocetnog stanja: strana se otvara odmah na obrascu, jer je
 * korisnik iz menija vec rekao sta hoce. Dugmad na ploci sluze da se predomisli.
 */
type Stanje = 'prijava' | 'tip' | 'registracija';

interface IzborTipa {
  naziv: string;
  vrednost: TipKorisnika;
  institucija: boolean;
}

/**
 * Prijava i registracija na jednoj strani.
 *
 * Zamisao: štampač na vrhu strane iz kog se spušta papir sa obrascem.
 * Tip korisnika se bira PRE štampe, pa izlazi list odgovarajuće dužine -
 * fizičko lice dobija kraći obrazac, pravno lice i štamparija duži.
 *
 * Provere postoje i ovde i na serveru. Ove ovde su radi poruke korisniku;
 * serverske su te koje stvarno štite bazu, jer se klijentske zaobilaze.
 */
@Component({
  selector: 'app-pristup',
  imports: [FormsModule, RouterLink],
  templateUrl: './pristup.html',
  styleUrl: './pristup.css',
})
export class Pristup implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Isti izrazi kao na serveru. Ako se menja jedan, mora i drugi.
  private readonly LOZINKA = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/;
  private readonly EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  private readonly TELEFON = /^[0-9+\/\s-]{6,20}$/;
  private readonly KORISNICKO_IME = /^[A-Za-z0-9_.-]{3,30}$/;
  private readonly MATICNI_BROJ = /^[0-9]{8}$/;
  private readonly PIB = /^[1-9][0-9]{8}$/;

  readonly tipovi: IzborTipa[] = [
    { naziv: 'Fizičko lice', vrednost: 'CLIENT_INDIVIDUAL', institucija: false },
    { naziv: 'Pravno lice', vrednost: 'CLIENT_COMPANY', institucija: true },
    { naziv: 'Štamparija', vrednost: 'PRINTER', institucija: true },
  ];

  stanje: Stanje = 'prijava';
  izabraniTip: IzborTipa | null = null;

  // prijava
  korisnickoIme = '';
  lozinka = '';

  // registracija
  rIme = '';
  rPrezime = '';
  rTelefon = '';
  rEmail = '';
  rNazivInstitucije = '';
  rAdresa = '';
  rGrad = '';
  rMaticniBroj = '';
  rPib = '';

  slika: File | null = null;
  imeSlike = '';

  greske: Record<string, string> = {};
  poruka = '';
  uspeh = '';
  slanje = false;

  ngOnInit(): void {
    // Ruta /registracija otvara stranu odmah na izboru tipa korisnika.
    if (this.route.snapshot.data['rezim'] === 'registracija') {
      this.stanje = 'tip';
    }
  }

  get otvoren(): boolean {
    return this.stanje === 'prijava' || this.stanje === 'registracija';
  }

  get jeInstitucija(): boolean {
    return this.izabraniTip?.institucija ?? false;
  }

  get naslovDrugogOdeljka(): string {
    return this.jeInstitucija ? 'Odgovorno lice' : 'Lični podaci';
  }

  get brojPoslednjegOdeljka(): string {
    return this.jeInstitucija ? 'IV' : 'III';
  }

  // --- upravljanje štampačem ------------------------------------------------

  /** Je li registracija trenutno aktivan obrazac (bira se tip ili se popunjava). */
  get uRegistraciji(): boolean {
    return this.stanje === 'tip' || this.stanje === 'registracija';
  }

  otvoriPrijavu(): void {
    if (this.stanje === 'prijava') return;
    this.ocisti();
    this.lozinka = '';
    this.stanje = 'prijava';
  }

  otvoriIzborTipa(): void {
    this.ocisti();
    this.lozinka = '';
    this.izabraniTip = null;
    this.stanje = 'tip';
  }

  izaberiTip(tip: IzborTipa): void {
    this.ocisti();
    this.izabraniTip = tip;
    this.stanje = 'registracija';
  }

  private ocisti(): void {
    this.greske = {};
    this.poruka = '';
    this.uspeh = '';
  }

  // --- prijava --------------------------------------------------------------

  posaljiPrijavu(): void {
    this.ocisti();

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

  // --- profilna slika -------------------------------------------------------

  /**
   * Provera slike u pregledaču: format i dimenzije 100x100 do 250x250 px.
   * Dimenzije se znaju tek kad se slika učita, pa je provera asinhrona.
   */
  izabranaSlika(dogadjaj: Event): void {
    const polje = dogadjaj.target as HTMLInputElement;
    const fajl = polje.files?.[0];

    delete this.greske['profileImage'];
    this.slika = null;
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
          `Slika mora biti između 100x100 i 250x250 piksela. ` +
          `Izabrana je ${sirina}x${visina}.`;
      } else {
        this.slika = fajl;
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

  // --- registracija ---------------------------------------------------------

  private proveriRegistraciju(): boolean {
    const nadjene: Record<string, string> = {};

    if (!this.korisnickoIme.trim()) {
      nadjene['username'] = 'Korisničko ime je obavezno polje.';
    } else if (!this.KORISNICKO_IME.test(this.korisnickoIme.trim())) {
      nadjene['username'] = 'Dozvoljena su slova, brojevi, tačka, donja crta i crta (3-30 znakova).';
    }

    if (!this.lozinka) {
      nadjene['password'] = 'Lozinka je obavezno polje.';
    } else if (!this.LOZINKA.test(this.lozinka)) {
      nadjene['password'] =
        'Lozinka mora imati 8-12 karaktera, počinjati slovom i sadržati veliko slovo, broj i specijalni znak.';
    }

    if (!this.rIme.trim()) nadjene['firstName'] = 'Ime je obavezno polje.';
    if (!this.rPrezime.trim()) nadjene['lastName'] = 'Prezime je obavezno polje.';

    if (!this.rTelefon.trim()) {
      nadjene['phone'] = 'Kontakt telefon je obavezno polje.';
    } else if (!this.TELEFON.test(this.rTelefon.trim())) {
      nadjene['phone'] = 'Telefon nije u ispravnom formatu.';
    }

    if (!this.rEmail.trim()) {
      nadjene['email'] = 'I-mejl adresa je obavezno polje.';
    } else if (!this.EMAIL.test(this.rEmail.trim())) {
      nadjene['email'] = 'I-mejl adresa nije u ispravnom formatu.';
    }

    if (this.jeInstitucija) {
      if (!this.rNazivInstitucije.trim()) {
        nadjene['institutionName'] = 'Naziv institucije je obavezno polje.';
      }
      if (!this.rAdresa.trim()) nadjene['institutionAddress'] = 'Adresa sedišta je obavezno polje.';
      if (!this.rGrad.trim()) nadjene['institutionCity'] = 'Grad je obavezno polje.';

      if (!this.MATICNI_BROJ.test(this.rMaticniBroj.trim())) {
        nadjene['registrationNumber'] = 'Matični broj mora imati tačno 8 cifara.';
      }
      if (!this.PIB.test(this.rPib.trim())) {
        nadjene['taxId'] = 'PIB mora imati 9 cifara i ne sme početi nulom.';
      }
    }

    // Greška slike je nastala pri izboru fajla - ne brišemo je ovde.
    if (this.greske['profileImage']) {
      nadjene['profileImage'] = this.greske['profileImage'];
    }

    this.greske = nadjene;
    return Object.keys(nadjene).length === 0;
  }

  posaljiRegistraciju(): void {
    this.poruka = '';
    this.uspeh = '';

    if (!this.izabraniTip || !this.proveriRegistraciju()) return;

    // Slika se šalje kao fajl, pa zahtev ide kao multipart/form-data.
    const podaci = new FormData();
    podaci.append('username', this.korisnickoIme.trim());
    podaci.append('password', this.lozinka);
    podaci.append('firstName', this.rIme.trim());
    podaci.append('lastName', this.rPrezime.trim());
    podaci.append('phone', this.rTelefon.trim());
    podaci.append('email', this.rEmail.trim());
    podaci.append('type', this.izabraniTip.vrednost);

    if (this.jeInstitucija) {
      podaci.append('institutionName', this.rNazivInstitucije.trim());
      podaci.append('institutionAddress', this.rAdresa.trim());
      podaci.append('institutionCity', this.rGrad.trim());
      podaci.append('registrationNumber', this.rMaticniBroj.trim());
      podaci.append('taxId', this.rPib.trim());
    }

    if (this.slika) podaci.append('profileImage', this.slika);

    this.slanje = true;
    this.auth.registracija(podaci).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.uspeh = odgovor.message;
      },
      error: (greska) => {
        this.slanje = false;

        // Server vraća greške vezane za konkretno polje - prikazujemo ih
        // tačno ispod tog polja, umesto jedne poruke na dnu.
        const nadjene: Record<string, string> = {};
        for (const g of greska.error?.errors ?? []) {
          nadjene[g.field] = g.message;
        }

        this.greske = nadjene;

        if (!Object.keys(nadjene).length) {
          this.poruka = greska.error?.message ?? 'Registracija nije uspela.';
        }
      },
    });
  }
}
