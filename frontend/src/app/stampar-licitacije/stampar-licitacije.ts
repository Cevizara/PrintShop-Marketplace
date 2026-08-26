import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MojaPonuda, Nabavka, Proizvod } from '../models/models';
import { ProcurementService, RedZaSlanje } from '../services/procurement.service';
import { ProductService } from '../services/product.service';

/** Šta je štampar upisao za jednu traženu stavku. */
interface UnosZaStavku {
  productId: string;
  unitPrice: number | null;
}

/**
 * Licitacije: otvorene javne nabavke i slanje ponude.
 *
 * Kako ovo radi, i zašto tako:
 *
 * Nabavka opisuje ŠTA se traži — naziv, kategorija, količina — a ne pokazuje na
 * konkretan proizvod. Ne može ni da pokazuje: proizvod u ovoj bazi pripada
 * tačno jednoj štampariji, pa bi pokazivač značio da samo ona može da se javi,
 * a to nije licitacija.
 *
 * Zato za svaku traženu stavku ŠTAMPAR sam bira koji SVOJ proizvod je ispunjava
 * i po kojoj ceni. Ništa se ne upoređuje po nazivu i ništa se ne pogađa.
 * Uslov „dovoljna količina svakog proizvoda na stanju" se onda proverava nad
 * proizvodom koji je štampar imenovao — i proverava se tek pri zaključivanju,
 * jer se lager u međuvremenu menja.
 *
 * Tekst zadatka: jedna ponuda po nabavci, sa SVIM traženim proizvodima.
 */
@Component({
  selector: 'app-stampar-licitacije',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './stampar-licitacije.html',
  styleUrl: './stampar-licitacije.css',
})
export class StamparLicitacije implements OnInit {
  private servis = inject(ProcurementService);
  private proizvodiServis = inject(ProductService);

  nabavke: Nabavka[] = [];
  mojiProizvodi: Proizvod[] = [];
  ponude: MojaPonuda[] = [];

  /** Nabavka za koju je otvoren obrazac, i uneto po svakoj traženoj stavci. */
  uPonudi = '';
  unos: Record<string, UnosZaStavku> = {};

  poruka = '';
  greska = '';
  ucitavanje = true;
  slanje = false;

  ngOnInit(): void {
    this.proizvodiServis.mojiProizvodi().subscribe({
      next: (proizvodi) => (this.mojiProizvodi = proizvodi),
    });

    this.ucitaj();
  }

  ucitaj(): void {
    this.ucitavanje = true;

    this.servis.otvorene().subscribe({
      next: (nabavke) => {
        this.ucitavanje = false;
        this.nabavke = nabavke;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Licitacije trenutno nisu dostupne.';
      },
    });

    this.servis.mojePonude().subscribe({
      next: (ponude) => (this.ponude = ponude),
    });
  }

  // --- prikaz ---------------------------------------------------------------

  imeUstanove(nabavka: Nabavka): string {
    const klijent = nabavka.clientId as { institution?: { name?: string }; username?: string };
    return klijent?.institution?.name ?? klijent?.username ?? '';
  }

  preostalo(nabavka: Nabavka): string {
    const sekundi = nabavka.secondsLeft ?? 0;
    if (sekundi <= 0) return 'rok je istekao';

    const minuta = Math.floor(sekundi / 60);
    return minuta ? `${minuta} min ${sekundi % 60} s` : `${sekundi} s`;
  }

  /**
   * Proizvodi koje nudimo za jednu traženu stavku.
   *
   * Prvo se nude oni iz iste kategorije — to je pomoć štamparu, ne pravilo:
   * ispod stoji i ostatak kataloga, jer odluku donosi on, a ne poređenje naziva.
   */
  predlozi(kategorija: string): Proizvod[] {
    const uKategoriji = this.mojiProizvodi.filter((p) => p.categoryName === kategorija);
    const ostali = this.mojiProizvodi.filter((p) => p.categoryName !== kategorija);
    return [...uKategoriji, ...ostali];
  }

  proizvod(id: string): Proizvod | undefined {
    return this.mojiProizvodi.find((p) => p._id === id);
  }

  /** Ukupan iznos ponude — isti račun koji server ponovi pri prijemu. */
  ukupno(nabavka: Nabavka): number {
    return nabavka.items.reduce((zbir, stavka) => {
      const uneto = this.unos[stavka._id];
      return zbir + (uneto?.unitPrice ?? 0) * stavka.quantity;
    }, 0);
  }

  /** Sve stavke moraju biti popunjene — delimična ponuda se ne prima. */
  get popunjeno(): boolean {
    const nabavka = this.nabavke.find((n) => n._id === this.uPonudi);
    if (!nabavka) return false;

    return nabavka.items.every((s) => {
      const uneto = this.unos[s._id];
      return !!uneto?.productId && uneto.unitPrice !== null && uneto.unitPrice >= 0;
    });
  }

  /** Upozorenje ako ponudimo proizvod kojeg nemamo dovoljno na stanju. */
  malo(stavkaId: string, kolicina: number): boolean {
    const izabran = this.proizvod(this.unos[stavkaId]?.productId ?? '');
    return !!izabran && izabran.stock < kolicina;
  }

  // --- ponuda ---------------------------------------------------------------

  otvoriPonudu(nabavka: Nabavka): void {
    this.poruka = '';
    this.greska = '';

    if (this.uPonudi === nabavka._id) {
      this.uPonudi = '';
      return;
    }

    this.uPonudi = nabavka._id;
    this.unos = {};

    for (const stavka of nabavka.items) {
      this.unos[stavka._id] = { productId: '', unitPrice: null };
    }
  }

  zatvoriPonudu(): void {
    this.uPonudi = '';
    this.unos = {};
  }

  posalji(nabavka: Nabavka): void {
    this.poruka = '';
    this.greska = '';

    if (!this.popunjeno) {
      this.greska = 'Ponuda mora pokriti sve tražene proizvode.';
      return;
    }

    const redovi: RedZaSlanje[] = nabavka.items.map((stavka) => ({
      itemId: stavka._id,
      productId: this.unos[stavka._id].productId,
      unitPrice: this.unos[stavka._id].unitPrice!,
    }));

    this.slanje = true;
    this.servis.posaljiPonudu(nabavka._id, redovi).subscribe({
      next: (odgovor) => {
        this.slanje = false;
        this.poruka = odgovor.message;
        this.zatvoriPonudu();
        this.ucitaj();
      },
      error: (g) => {
        this.slanje = false;
        this.greska = g.error?.errors?.[0]?.message ?? g.error?.message ?? 'Slanje ponude nije uspelo.';
      },
    });
  }
}
