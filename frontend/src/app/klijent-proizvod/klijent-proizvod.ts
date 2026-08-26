import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Komentar, OdgovorKomentara, Proizvod } from '../models/models';
import { slikaUrl } from '../services/api';
import { AuthService } from '../services/auth.service';
import { CookieService } from '../services/cookie.service';
import { InvoiceService } from '../services/invoice.service';
import { ProductService } from '../services/product.service';

/**
 * Proširene informacije o proizvodu - vidi ih samo prijavljen klijent.
 *
 * Razlika u odnosu na javnu stranu, tačno po tekstu zadatka: duži opis, cena po
 * komadu, boja koja se bira iz padajuće liste, i vrste štampe sa maksimalnim
 * dimenzijama i dodatnom cenom. Uz to i adresa štamparije.
 *
 * Galerija radi isto kao na javnoj strani, sa istim kolačićem: izabrana slika
 * ostaje glavna i kada se strana ponovo otvori.
 */
@Component({
  selector: 'app-klijent-proizvod',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './klijent-proizvod.html',
  styleUrl: './klijent-proizvod.css',
})
export class KlijentProizvod implements OnInit {
  private servis = inject(ProductService);
  private route = inject(ActivatedRoute);
  private kolacici = inject(CookieService);
  private sanitizer = inject(DomSanitizer);
  private ocene = inject(InvoiceService);
  private auth = inject(AuthService);

  /**
   * Poslednjih pet komentara svih klijenata, sa brojem sviđanja i nesviđanja.
   * Tekst zadatka traži baš pet, i baš na ovoj strani.
   */
  komentari: OdgovorKomentara | null = null;

  proizvod: Proizvod | null = null;
  prikazana = '';
  izabranaBoja = '';
  poruka = '';

  slika = slikaUrl;

  ngOnInit(): void {
    const id = String(this.route.snapshot.paramMap.get('id'));

    this.servis.detalji(id).subscribe({
      next: (podaci) => {
        this.proizvod = podaci;

        // Ako boje nisu unete, tekst zadatka kaže da važi podrazumevana bela.
        this.izabranaBoja = podaci.availableColors[0] ?? 'Bela';

        // Izabrana slika iz galerije pamti se u kolačiću ovog pregledača.
        const zapamcena = this.kolacici.zapamcenaSlika(id);
        this.prikazana =
          zapamcena && this.sveSlike.includes(zapamcena) ? zapamcena : podaci.mainImage;
      },
      error: (greska) => (this.poruka = greska.error?.message ?? 'Proizvod nije pronađen.'),
    });

    // Komentari se učitavaju zasebno: strana je upotrebljiva i bez njih, pa
    // njihov neuspeh ne sme da obori prikaz proizvoda.
    this.ocene.komentari(id).subscribe({
      next: (odgovor) => (this.komentari = odgovor),
    });
  }

  /**
   * Je li komentar ostavio prijavljeni korisnik.
   * Tekst zadatka: „Komentare koje je on ostavio treba uokviriti određenom
   * diskretnom linijom u narandžastoj boji."
   */
  mojKomentar(komentar: Komentar): boolean {
    return this.auth.korisnik()?._id === komentar.userId;
  }

  get sveSlike(): string[] {
    if (!this.proizvod) return [];
    return [this.proizvod.mainImage, ...this.proizvod.additionalImages];
  }

  /** Ima li štamparija unete koordinate - bez njih se mapa ne prikazuje. */
  get imaMapu(): boolean {
    return this.proizvod?.printerLat !== undefined && this.proizvod?.printerLng !== undefined;
  }

  /**
   * Mapa sa lokacijom štamparije.
   *
   * Koristi se OpenStreetMap i njegova ugradna strana, kroz običan <iframe>.
   * Zašto tako, a ne bibliotekom:
   *  - ne traži ključ, nalog ni `npm install`, pa nema šta da se instalira na
   *    odbrani, a tekst zadatka izričito dozvoljava spoljne interfejse za mape;
   *  - Leaflet bi bio ista stvar uz jednu zavisnost više, jer i on pločice mape
   *    povlači sa mreže.
   *
   * Okvir (bbox) je mali pravougaonik oko same štamparije - da mapa dođe već
   * uvećana na ulicu, umesto na celu zemlju. Marker označava tačnu tačku.
   *
   * Napomena: kao i svaka mapa, traži pristup internetu u trenutku prikaza.
   */
  get mapaUrl(): SafeResourceUrl | null {
    if (!this.imaMapu) return null;

    const lat = this.proizvod!.printerLat!;
    const lng = this.proizvod!.printerLng!;
    const okvir = 0.006; // ~600 m na svaku stranu

    const adresa =
      'https://www.openstreetmap.org/export/embed.html' +
      `?bbox=${lng - okvir}%2C${lat - okvir}%2C${lng + okvir}%2C${lat + okvir}` +
      `&layer=mapnik&marker=${lat}%2C${lng}`;

    // Angular iz opreza ne pušta proizvoljnu adresu u <iframe>. Ovde je adresa
    // sastavljena u kodu od brojeva iz baze, a ne od korisničkog unosa.
    return this.sanitizer.bypassSecurityTrustResourceUrl(adresa);
  }

  /** Ista lokacija, ali otvorena u punoj mapi u novom prozoru. */
  get mapaVelikaUrl(): string {
    const lat = this.proizvod?.printerLat ?? 0;
    const lng = this.proizvod?.printerLng ?? 0;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  }

  izaberi(putanja: string): void {
    this.prikazana = putanja;
    if (this.proizvod) {
      this.kolacici.zapamtiSliku(this.proizvod._id, putanja);
    }
  }
}
