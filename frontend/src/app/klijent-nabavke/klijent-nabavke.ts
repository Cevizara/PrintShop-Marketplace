import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IzvestajNabavke, Nabavka, StatusNabavke } from '../models/models';
import { otvoriPdf } from '../services/preuzimanje';
import { ProcurementService } from '../services/procurement.service';

/**
 * Javne nabavke ustanove (klijent — pravno lice).
 *
 * Tekst zadatka: pravno lice iz e-korpe ne dobija fakture nego raspisuje poziv
 * za podnošenje ponuda, koji traje 10 minuta. Po isteku, posao dobija
 * štamparija sa najnižom ukupnom ponudom koja ima dovoljne količine na stanju.
 *
 * Zaključivanje je LENJO, po fusnoti 6: nema tajmera ni pozadinskog posla —
 * server proveri rok pri svakom čitanju ovog spiska. Zato se posle isteka
 * dovoljno osvežiti stranu da bi se videlo ko je dobio.
 */
@Component({
  selector: 'app-klijent-nabavke',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './klijent-nabavke.html',
  styleUrl: './klijent-nabavke.css',
})
export class KlijentNabavke implements OnInit {
  private servis = inject(ProcurementService);

  nabavke: Nabavka[] = [];

  /** Otvoreni izveštaj — sve poslate ponude za jednu nabavku. */
  izvestaj: IzvestajNabavke | null = null;
  uIzvestaju = '';

  greska = '';
  ucitavanje = true;

  ngOnInit(): void {
    this.ucitaj();
  }

  ucitaj(): void {
    this.ucitavanje = true;

    this.servis.moje().subscribe({
      next: (nabavke) => {
        this.ucitavanje = false;
        this.nabavke = nabavke;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Javne nabavke trenutno nisu dostupne.';
      },
    });
  }

  // --- prikaz ---------------------------------------------------------------

  nazivStatusa(status: StatusNabavke): string {
    switch (status) {
      case 'OPEN':
        return 'licitacija u toku';
      case 'AWARDED':
        return 'dodeljena';
      default:
        return 'neuspela';
    }
  }

  bojaStatusa(status: StatusNabavke): string {
    switch (status) {
      case 'OPEN':
        return 'var(--magenta)';
      case 'AWARDED':
        return '#1F7A4C';
      default:
        return 'var(--crvena-zemlja)';
    }
  }

  /** Preostalo vreme kao „4 min 12 s". Računa ga server pri učitavanju. */
  preostalo(nabavka: Nabavka): string {
    const sekundi = nabavka.secondsLeft ?? 0;
    if (sekundi <= 0) return 'rok je istekao';

    const minuta = Math.floor(sekundi / 60);
    return minuta ? `${minuta} min ${sekundi % 60} s` : `${sekundi} s`;
  }

  imeStamparije(nabavka: Nabavka): string {
    return nabavka.winnerPrinterId?.institution?.name ?? '';
  }

  ukupnoKomada(nabavka: Nabavka): number {
    return nabavka.items.reduce((zbir, s) => zbir + s.quantity, 0);
  }

  // --- izveštaj -------------------------------------------------------------

  /**
   * Tekst zadatka traži izveštaj o SVIM poslatim ponudama i onoj koja je
   * dobila. Ovde se prikazuje na strani; PDF je crvena stavka i nije urađen.
   */
  otvoriIzvestaj(nabavka: Nabavka): void {
    if (this.uIzvestaju === nabavka._id) {
      this.uIzvestaju = '';
      this.izvestaj = null;
      return;
    }

    this.uIzvestaju = nabavka._id;
    this.izvestaj = null;

    this.servis.izvestaj(nabavka._id).subscribe({
      next: (izvestaj) => {
        this.izvestaj = izvestaj;

        // Čitanje izveštaja može da zaključi nabavku, pa se red osvežava.
        const mesto = this.nabavke.findIndex((n) => n._id === nabavka._id);
        if (mesto >= 0) this.nabavke[mesto] = izvestaj.procurement;
      },
      error: (g) => (this.greska = g.error?.message ?? 'Izveštaj nije dostupan.'),
    });
  }

  /** PDF izvestaj koji tekst zadatka trazi. Pravi se tek kad je licitacija gotova. */
  preuzmiIzvestaj(nabavka: Nabavka): void {
    this.greska = '';

    this.servis.izvestajPdf(nabavka._id).subscribe({
      next: (sadrzaj) => otvoriPdf(sadrzaj, 'izvestaj-' + nabavka.number + '.pdf'),
      error: () => (this.greska = 'PDF izveštaj trenutno nije dostupan.'),
    });
  }

  imeStamparijePonude(ponuda: { printerId: unknown }): string {
    const stampar = ponuda.printerId as { institution?: { name?: string; city?: string } };
    return stampar?.institution?.name ?? '';
  }

  jePobednicka(ponudaId: string): boolean {
    return this.izvestaj?.procurement.winnerBidId === ponudaId;
  }
}
