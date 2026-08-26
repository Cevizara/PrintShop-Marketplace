import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Kategorija, UslugaStampe } from '../models/models';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';

/**
 * Dodavanje novog proizvoda.
 *
 * Kategorije i potkategorije se biraju iz padajućih lista, a ne kucaju - tekst
 * zadatka kaže da se proizvodi dodaju "u već predefinisane kategorije i
 * potkategorije iz baze podataka". Server to i proverava: kategorija koja ne
 * postoji odbija zahtev.
 *
 * Usluge štampe se dodaju u listu pre slanja i putuju kao JSON tekst unutar
 * multipart forme - taj format poznaje samo polja i fajlove, ne i ugnježdene
 * nizove objekata.
 */
@Component({
  selector: 'app-stampar-novi-proizvod',
  imports: [FormsModule, RouterLink],
  templateUrl: './stampar-novi-proizvod.html',
  styleUrl: './stampar-novi-proizvod.css',
})
export class StamparNoviProizvod implements OnInit {
  private servis = inject(ProductService);
  private kategorijeServis = inject(CategoryService);
  private router = inject(Router);

  kategorije: Kategorija[] = [];

  sifra = '';
  naziv = '';
  opis = '';
  kategorija = '';
  potkategorija = '';
  cena: number | null = null;
  zalihe: number | null = null;
  boje = '';

  usluge: UslugaStampe[] = [];
  // Nova usluga koja se popunjava pre nego što se doda u listu.
  uSifra = '';
  uTip = '';
  uCena: number | null = null;
  uSirina: number | null = null;
  uVisina: number | null = null;
  greskaUsluge = '';

  glavnaSlika: File | null = null;
  dodatneSlike: File[] = [];

  greske: Record<string, string> = {};
  poruka = '';
  slanje = false;

  ngOnInit(): void {
    this.kategorijeServis.sve().subscribe({
      next: (kategorije) => (this.kategorije = kategorije),
      error: () => (this.poruka = 'Spisak kategorija trenutno nije dostupan.'),
    });
  }

  /** Potkategorije zavise od izabrane kategorije. */
  get potkategorije(): string[] {
    return this.kategorije.find((k) => k.name === this.kategorija)?.subcategories.map((p) => p.name) ?? [];
  }

  promenjenaKategorija(): void {
    // Stara potkategorija ne pripada novoj kategoriji, pa se poništava.
    this.potkategorija = '';
  }

  // --- usluge štampe --------------------------------------------------------

  dodajUslugu(): void {
    this.greskaUsluge = '';

    if (!this.uSifra.trim() || !this.uTip.trim()) {
      this.greskaUsluge = 'Šifra i tip štampe su obavezni.';
      return;
    }

    if (this.uCena === null || this.uCena < 0) {
      this.greskaUsluge = 'Dodatna cena mora biti broj koji nije negativan.';
      return;
    }

    if (!this.uSirina || !this.uVisina || this.uSirina < 1 || this.uVisina < 1) {
      this.greskaUsluge = 'Maksimalne dimenzije moraju biti veće od nule.';
      return;
    }

    if (this.usluge.some((u) => u.code.toLowerCase() === this.uSifra.trim().toLowerCase())) {
      this.greskaUsluge = 'Usluga sa ovom šifrom je već dodata.';
      return;
    }

    this.usluge.push({
      code: this.uSifra.trim(),
      printType: this.uTip.trim(),
      extraPricePerPiece: this.uCena,
      maxWidthMm: this.uSirina,
      maxHeightMm: this.uVisina,
    });

    this.uSifra = '';
    this.uTip = '';
    this.uCena = null;
    this.uSirina = null;
    this.uVisina = null;
  }

  ukloniUslugu(redni: number): void {
    this.usluge.splice(redni, 1);
  }

  // --- slike ----------------------------------------------------------------

  izabranaGlavna(dogadjaj: Event): void {
    const fajl = (dogadjaj.target as HTMLInputElement).files?.[0] ?? null;
    delete this.greske['mainImage'];

    if (fajl && !this.jeSlika(fajl)) {
      this.greske['mainImage'] = 'Dozvoljeni su samo JPG, PNG i GIF formati.';
      this.glavnaSlika = null;
      return;
    }

    this.glavnaSlika = fajl;
  }

  izabraneDodatne(dogadjaj: Event): void {
    const fajlovi = Array.from((dogadjaj.target as HTMLInputElement).files ?? []);
    delete this.greske['additionalImages'];

    if (fajlovi.some((f) => !this.jeSlika(f))) {
      this.greske['additionalImages'] = 'Dozvoljeni su samo JPG, PNG i GIF formati.';
      this.dodatneSlike = [];
      return;
    }

    if (fajlovi.length > 3) {
      this.greske['additionalImages'] = 'Galerija prima najviše 3 dodatne slike.';
      this.dodatneSlike = [];
      return;
    }

    this.dodatneSlike = fajlovi;
  }

  private jeSlika(fajl: File): boolean {
    return ['image/jpeg', 'image/png', 'image/gif'].includes(fajl.type);
  }

  // --- slanje ---------------------------------------------------------------

  private proveri(): boolean {
    const nadjene: Record<string, string> = {};

    if (!this.sifra.trim()) nadjene['code'] = 'Šifra proizvoda je obavezno polje.';
    if (!this.naziv.trim()) nadjene['name'] = 'Naziv proizvoda je obavezno polje.';
    if (!this.kategorija) nadjene['categoryName'] = 'Izaberite kategoriju.';

    if (this.cena === null || this.cena < 0) {
      nadjene['unitPrice'] = 'Jedinična cena mora biti broj koji nije negativan.';
    }

    if (this.zalihe === null || this.zalihe < 0 || !Number.isInteger(this.zalihe)) {
      nadjene['stock'] = 'Količina mora biti ceo broj koji nije negativan.';
    }

    // Greške slika su nastale pri izboru fajla - zadržavaju se.
    if (this.greske['mainImage']) nadjene['mainImage'] = this.greske['mainImage'];
    if (this.greske['additionalImages']) {
      nadjene['additionalImages'] = this.greske['additionalImages'];
    }

    this.greske = nadjene;
    return Object.keys(nadjene).length === 0;
  }

  sacuvaj(): void {
    this.poruka = '';

    if (!this.proveri()) return;

    const podaci = new FormData();
    podaci.append('code', this.sifra.trim());
    podaci.append('name', this.naziv.trim());
    podaci.append('description', this.opis.trim());
    podaci.append('categoryName', this.kategorija);
    podaci.append('subcategoryName', this.potkategorija);
    podaci.append('unitPrice', String(this.cena));
    podaci.append('stock', String(this.zalihe));
    podaci.append('availableColors', this.boje.trim());
    podaci.append('printServices', JSON.stringify(this.usluge));

    if (this.glavnaSlika) podaci.append('mainImage', this.glavnaSlika);
    for (const fajl of this.dodatneSlike) podaci.append('additionalImages', fajl);

    this.slanje = true;
    this.servis.dodaj(podaci).subscribe({
      next: () => {
        this.slanje = false;
        this.router.navigate(['/stampar/proizvodi']);
      },
      error: (g) => {
        this.slanje = false;
        const nadjene: Record<string, string> = {};
        for (const greska of g.error?.errors ?? []) nadjene[greska.field] = greska.message;
        this.greske = nadjene;

        if (!Object.keys(nadjene).length) {
          this.poruka = g.error?.message ?? 'Dodavanje nije uspelo.';
        }
      },
    });
  }
}
