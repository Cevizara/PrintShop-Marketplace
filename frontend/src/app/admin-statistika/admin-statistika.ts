import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { KretanjeOcene, NarucivanProizvod, PrometStamparije } from '../models/models';
import { AdminService } from '../services/admin.service';

/** Jedno parče pita grafikona, već preračunato u SVG putanju. */
interface Parce {
  name: string;
  quantity: number;
  share: number;
  boja: string;
  putanja: string;
}

/** Jedna tačka na liniji, već preračunata u koordinate crteža. */
interface TackaCrteza {
  x: number;
  y: number;
  zbir: number;
  datum: Date;
}

/** Jedna linija na grafikonu - jedan proizvod. */
interface Linija {
  productId: string;
  naziv: string;
  boja: string;
  tacke: TackaCrteza[];
  putanja: string;
  konacniZbir: number;
}

/**
 * Administratorska statistika — sva tri grafikona koja tekst zadatka traži:
 *
 *   1. promet štamparija u poslednjem kvartalu   — stubičasti
 *   2. najčešće naručivani proizvodi u mesec dana — pita
 *   3. kretanje ocene proizvoda kroz vreme        — linijski
 *
 * Svi su nacrtani kao SVG u samom templejtu, bez biblioteke za grafikone:
 *  - ceo dizajn sistem je ionako ručno crtani SVG (avatari, slike proizvoda,
 *    registarski markovi), pa se uklapa bez borbe sa tuđim temama;
 *  - nema zavisnosti koja se mora instalirati i braniti na odbrani;
 *  - stubić je pravougaonik, parče pite je luk, a linija je `polyline`.
 *
 * Šta linija na trećem grafikonu pokazuje: ZBIR ocena do tog trenutka. Svaki
 * lajk podiže je za jedan, dislajk spušta. Zato se vidi *kretanje* — proizvod
 * koji je krenuo loše pa se popravio ima liniju koja pada pa raste, što se iz
 * pukog broja lajkova ne bi videlo.
 *
 * Treći grafikon je uopšte moguć zato što su ocene zasebna kolekcija sa datumom
 * po svakoj oceni — odluka iz PH-002. Brojač na proizvodu ne bi čuvao istoriju.
 */
@Component({
  selector: 'app-admin-statistika',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './admin-statistika.html',
  styleUrl: './admin-statistika.css',
})
export class AdminStatistika implements OnInit {
  private servis = inject(AdminService);

  /** Površina crteža u SVG koordinatama. Visina i širina su odnos, ne pikseli. */
  readonly SIRINA = 900;
  readonly VISINA = 340;
  readonly MARGINA = { levo: 44, desno: 16, gore: 18, dole: 34 };

  /** CMYK paleta iz dizajn sistema, pa još nekoliko tonova za više linija. */
  readonly BOJE = [
    '#00A0C6', '#D6006E', '#F5C400', '#7FB800',
    '#9A3B22', '#8E5BD0', '#E8763A', '#2FA37C',
  ];

  sirovi: KretanjeOcene[] = [];

  /** Proizvodi isključeni iz prikaza - tekst zadatka to izričito traži. */
  iskljuceni = new Set<string>();

  promet: PrometStamparije[] = [];
  proizvodi: NarucivanProizvod[] = [];

  ucitavanje = true;
  greska = '';

  ngOnInit(): void {
    this.servis.kretanjeOcena().subscribe({
      next: (podaci) => {
        this.ucitavanje = false;
        this.sirovi = podaci;
      },
      error: (g) => {
        this.ucitavanje = false;
        this.greska = g.error?.message ?? 'Statistika trenutno nije dostupna.';
      },
    });

    this.servis.prometStamparija().subscribe({ next: (p) => (this.promet = p) });
    this.servis.narucivaniProizvodi().subscribe({ next: (p) => (this.proizvodi = p) });
  }

  // =========================================================================
  //  1. Promet štamparija u poslednjem kvartalu — stubičasti grafikon
  // =========================================================================

  /**
   * Najveći promet u spisku — po njemu se skaliraju svi stubići.
   * Server već vraća opadajuće poređan spisak, pa je to prvi red.
   */
  get najveciPromet(): number {
    return this.promet[0]?.total ?? 1;
  }

  /** Dužina stubića u procentima. */
  duzinaStubica(iznos: number): number {
    return Math.max(1, (iznos / this.najveciPromet) * 100);
  }

  bojaStubica(redni: number): string {
    return this.BOJE[redni % this.BOJE.length];
  }

  get ukupanPromet(): number {
    return this.promet.reduce((zbir, p) => zbir + p.total, 0);
  }

  // =========================================================================
  //  2. Najčešće naručivani proizvodi — pita grafikon
  // =========================================================================

  /**
   * Parčad pite, preračunata u SVG lukove.
   *
   * Krug se obilazi od vrha (ugao -90°), a svako parče je jedan `path` sa
   * lukom. `veliki` zastavica kaže SVG-u da luk ide „dužim putem" kada parče
   * pređe pola kruga — bez nje bi takvo parče bilo nacrtano naopako.
   */
  get parcad(): Parce[] {
    const ukupno = this.proizvodi.reduce((zbir, p) => zbir + p.quantity, 0);
    if (!ukupno) return [];

    const centar = 110;
    const poluprecnik = 100;
    let ugao = -Math.PI / 2;

    return this.proizvodi.map((proizvod, redni) => {
      const deo = (proizvod.quantity / ukupno) * Math.PI * 2;
      const kraj = ugao + deo;

      const x1 = centar + poluprecnik * Math.cos(ugao);
      const y1 = centar + poluprecnik * Math.sin(ugao);
      const x2 = centar + poluprecnik * Math.cos(kraj);
      const y2 = centar + poluprecnik * Math.sin(kraj);
      const veliki = deo > Math.PI ? 1 : 0;

      // Jedan jedini proizvod bi dao luk od tačke do iste tačke, koji se ne
      // vidi - zato se u tom slučaju crta pun krug.
      const putanja =
        this.proizvodi.length === 1
          ? `M ${centar} ${centar - poluprecnik} A ${poluprecnik} ${poluprecnik} 0 1 1 ${centar - 0.01} ${centar - poluprecnik} Z`
          : `M ${centar} ${centar} L ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
            `A ${poluprecnik} ${poluprecnik} 0 ${veliki} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

      ugao = kraj;

      return {
        name: proizvod.name,
        quantity: proizvod.quantity,
        share: proizvod.share,
        boja: this.BOJE[redni % this.BOJE.length],
        putanja,
      };
    });
  }

  get ukupnoKomada(): number {
    return this.proizvodi.reduce((zbir, p) => zbir + p.quantity, 0);
  }

  // --- isključivanje proizvoda ----------------------------------------------

  prikazan(productId: string): boolean {
    return !this.iskljuceni.has(productId);
  }

  prebaci(productId: string): void {
    if (this.iskljuceni.has(productId)) this.iskljuceni.delete(productId);
    else this.iskljuceni.add(productId);
  }

  prikaziSve(): void {
    this.iskljuceni.clear();
  }

  sakrijSve(): void {
    this.iskljuceni = new Set(this.sirovi.map((p) => p.productId));
  }

  bojaProizvoda(productId: string): string {
    const mesto = this.sirovi.findIndex((p) => p.productId === productId);
    return this.BOJE[mesto % this.BOJE.length];
  }

  // --- crtanje ---------------------------------------------------------------

  private get vidljivi(): KretanjeOcene[] {
    return this.sirovi.filter((p) => this.prikazan(p.productId));
  }

  get imaSta(): boolean {
    return this.vidljivi.some((p) => p.points.length > 0);
  }

  /**
   * Sve linije, preračunate u koordinate crteža.
   *
   * Osa vremena i osa zbira se računaju iz VIDLJIVIH proizvoda, ne iz svih:
   * kada se proizvod isključi, grafikon se prilagodi ostatku umesto da ostane
   * stisnut zbog nečega što se više ne vidi.
   */
  get linije(): Linija[] {
    const vidljivi = this.vidljivi;
    if (!vidljivi.length) return [];

    const { odKada, doKada, najmanji, najveci } = this.opseg(vidljivi);
    const rasponVremena = Math.max(1, doKada - odKada);
    const rasponZbira = Math.max(1, najveci - najmanji);

    const sirinaCrteza = this.SIRINA - this.MARGINA.levo - this.MARGINA.desno;
    const visinaCrteza = this.VISINA - this.MARGINA.gore - this.MARGINA.dole;

    return vidljivi.map((proizvod) => {
      let zbir = 0;
      const tacke: TackaCrteza[] = [];

      for (const tacka of proizvod.points) {
        zbir += tacka.value;
        const vreme = new Date(tacka.date).getTime();

        tacke.push({
          x: this.MARGINA.levo + ((vreme - odKada) / rasponVremena) * sirinaCrteza,
          // Y raste nadole u SVG-u, pa se veći zbir mora preslikati u manji y.
          y: this.MARGINA.gore + (1 - (zbir - najmanji) / rasponZbira) * visinaCrteza,
          zbir,
          datum: new Date(tacka.date),
        });
      }

      return {
        productId: proizvod.productId,
        naziv: proizvod.name,
        boja: this.bojaProizvoda(proizvod.productId),
        tacke,
        putanja: tacke.map((t) => `${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(' '),
        konacniZbir: zbir,
      };
    });
  }

  /** Najraniji i najkasniji datum, i najmanji i najveći zbir među vidljivima. */
  private opseg(proizvodi: KretanjeOcene[]) {
    let odKada = Infinity;
    let doKada = -Infinity;
    let najmanji = 0;
    let najveci = 0;

    for (const proizvod of proizvodi) {
      let zbir = 0;
      for (const tacka of proizvod.points) {
        const vreme = new Date(tacka.date).getTime();
        odKada = Math.min(odKada, vreme);
        doKada = Math.max(doKada, vreme);

        zbir += tacka.value;
        najmanji = Math.min(najmanji, zbir);
        najveci = Math.max(najveci, zbir);
      }
    }

    return { odKada, doKada, najmanji, najveci };
  }

  /** Vodoravne linije mreže, sa vrednošću zbira uz svaku. */
  get mreza(): { y: number; oznaka: number }[] {
    const vidljivi = this.vidljivi;
    if (!vidljivi.length) return [];

    const { najmanji, najveci } = this.opseg(vidljivi);
    const raspon = Math.max(1, najveci - najmanji);
    const visinaCrteza = this.VISINA - this.MARGINA.gore - this.MARGINA.dole;

    // Pet podeoka je dovoljno da se čita, a da se osa ne zatrpa brojevima.
    const koraka = 5;
    const linije: { y: number; oznaka: number }[] = [];

    for (let i = 0; i <= koraka; i++) {
      const udeo = i / koraka;
      linije.push({
        y: this.MARGINA.gore + (1 - udeo) * visinaCrteza,
        oznaka: Math.round(najmanji + udeo * raspon),
      });
    }

    return linije;
  }

  /** Datumi ispod ose - samo prvi i poslednji, da se ne preklapaju. */
  get granicniDatumi(): { od: Date; do: Date } | null {
    const vidljivi = this.vidljivi;
    if (!vidljivi.length) return null;

    const { odKada, doKada } = this.opseg(vidljivi);
    if (!Number.isFinite(odKada)) return null;

    return { od: new Date(odKada), do: new Date(doKada) };
  }

  /** Ukupan broj ocena kod vidljivih proizvoda - broj tačaka na grafikonu. */
  get brojOcena(): number {
    return this.vidljivi.reduce((zbir, p) => zbir + p.points.length, 0);
  }
}
