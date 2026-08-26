/**
 * Crtezi proizvoda, po potkategoriji.
 *
 * Uzorci slika su ranije bili tekstualne kartice - naziv proizvoda na obojenoj
 * podlozi. Bilo je citljivo, ali se na strani za pripremu stampe nije videlo
 * NA CEMU se stampa, pa nije imalo smisla postavljati otisak preko toga.
 *
 * Ovde je za svaku potkategoriju nacrtan sam predmet. I dalje SVG, iz istih
 * razloga kao i ranije: obican tekst, bez biblioteke za obradu slika, ostar na
 * svakoj velicini.
 *
 * Svaki crtez je u koordinatama 0-600 i ostavlja sredinu slobodnu - tu ide
 * otisak koji klijent postavlja na strani za pripremu.
 */

/** Boje jednog crteza: telo predmeta, ivica, i senka/detalj. */
export interface Paleta {
  telo: string;
  ivica: string;
  detalj: string;
}

const A = (p: Paleta) => `fill="${p.telo}" stroke="${p.ivica}" stroke-width="3"`;

/** Polo majica - telo, rukavi, kragna sa dugmadima. */
function majica(p: Paleta): string {
  return `
  <path ${A(p)} stroke-linejoin="round" d="
    M215 130 L165 155 L120 235 L175 268 L196 232 L196 480
    Q300 496 404 480 L404 232 L425 268 L480 235 L435 155 L385 130
    L340 118 Q300 150 260 118 Z"/>
  <path fill="none" stroke="${p.ivica}" stroke-width="3" stroke-linejoin="round"
        d="M260 118 L300 168 L340 118"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2.5" d="M300 168 L300 214"/>
  <circle cx="300" cy="182" r="4.5" fill="${p.detalj}"/>
  <circle cx="300" cy="204" r="4.5" fill="${p.detalj}"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".55"
        d="M196 470 Q300 486 404 470"/>`;
}

/** Duks sa kapuljacom - telo, kapuljaca, vezice, prednji dzep. */
function duks(p: Paleta): string {
  return `
  <path ${A(p)} stroke-linejoin="round" d="
    M210 150 L150 180 L108 268 L166 302 L188 258 L188 492
    Q300 508 412 492 L412 258 L434 302 L492 268 L450 180 L390 150 Z"/>
  <path ${A(p)} stroke-linejoin="round" d="
    M210 150 Q300 232 390 150 Q356 120 300 120 Q244 120 210 150 Z"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="3" stroke-linecap="round"
        d="M272 186 L266 244 M328 186 L334 244"/>
  <circle cx="266" cy="248" r="5" fill="${p.detalj}"/>
  <circle cx="334" cy="248" r="5" fill="${p.detalj}"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2.5" opacity=".7"
        d="M226 404 L226 452 Q300 462 374 452 L374 404"/>`;
}

/** Keramicka solja - valjak sa drskom. */
function solja(p: Paleta): string {
  return `
  <path ${A(p)} d="M170 200 L170 430 Q170 470 210 470 L370 470 Q410 470 410 430 L410 200 Z"/>
  <ellipse cx="290" cy="200" rx="120" ry="34" ${A(p)}/>
  <ellipse cx="290" cy="200" rx="98" ry="25" fill="${p.detalj}" opacity=".45"/>
  <path fill="none" stroke="${p.ivica}" stroke-width="18" stroke-linecap="round"
        d="M412 250 Q478 258 478 318 Q478 378 412 386"/>
  <path fill="none" stroke="${p.telo}" stroke-width="9" stroke-linecap="round"
        d="M412 250 Q478 258 478 318 Q478 378 412 386"/>`;
}

/** Platnena cegera torba - telo sa dve rucke. */
function cegera(p: Paleta): string {
  return `
  <path fill="none" stroke="${p.ivica}" stroke-width="11" stroke-linecap="round"
        d="M232 208 Q232 122 300 122 Q368 122 368 208"/>
  <path ${A(p)} stroke-linejoin="round" d="M158 200 L442 200 L420 486 L180 486 Z"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2.5" opacity=".6"
        d="M158 226 L442 226"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".45"
        d="M186 470 L414 470"/>`;
}

/** Poster - uspravan list sa senkom. */
function poster(p: Paleta): string {
  return `
  <rect x="176" y="96" width="256" height="408" rx="3" fill="${p.detalj}" opacity=".25"/>
  <rect x="166" y="86" width="256" height="408" rx="3" ${A(p)}/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".5"
        d="M188 108 L400 108 M188 472 L400 472"/>`;
}

/** Flajer A5 - manji list, blago zakosen. */
function flajer(p: Paleta): string {
  return `
  <g transform="rotate(-6 300 300)">
    <rect x="204" y="128" width="200" height="344" rx="3" fill="${p.detalj}" opacity=".25"
          transform="translate(12 12)"/>
    <rect x="204" y="128" width="200" height="344" rx="3" ${A(p)}/>
    <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".5"
          d="M226 150 L382 150 M226 450 L382 450"/>
  </g>`;
}

/** Vizit karte - dve kartice jedna preko druge. */
function vizitKarta(p: Paleta): string {
  return `
  <g transform="rotate(-8 300 300)">
    <rect x="128" y="248" width="300" height="168" rx="8" fill="${p.detalj}" opacity=".3"/>
  </g>
  <rect x="150" y="216" width="300" height="168" rx="8" ${A(p)}/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2.5" opacity=".55"
        d="M176 356 L300 356"/>`;
}

/** Fascikla - korice sa preklopom. */
function fascikla(p: Paleta): string {
  return `
  <path ${A(p)} stroke-linejoin="round" d="M150 150 L296 150 L326 192 L450 192 L450 460 L150 460 Z"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2.5" opacity=".55"
        d="M150 240 L450 240"/>`;
}

/** Hemijska olovka - kosa, sa vrhom i klipsom. */
function olovka(p: Paleta): string {
  return `
  <g transform="rotate(38 300 300)">
    <rect x="272" y="120" width="56" height="300" rx="6" ${A(p)}/>
    <path ${A(p)} stroke-linejoin="round" d="M272 420 L300 496 L328 420 Z"/>
    <rect x="292" y="486" width="16" height="26" rx="4" fill="${p.ivica}"/>
    <rect x="272" y="120" width="56" height="46" rx="6" fill="${p.detalj}" opacity=".7"/>
    <rect x="330" y="140" width="12" height="82" rx="6" fill="${p.ivica}"/>
  </g>`;
}

/** Zahvalnica - list sa dvostrukim okvirom. */
function zahvalnica(p: Paleta): string {
  return `
  <rect x="120" y="170" width="360" height="260" rx="3" ${A(p)}/>
  <rect x="146" y="196" width="308" height="208" fill="none"
        stroke="${p.detalj}" stroke-width="2" opacity=".7"/>`;
}

/** Pozivnica - koverta sa preklopom. */
function pozivnica(p: Paleta): string {
  return `
  <rect x="128" y="188" width="344" height="224" rx="5" ${A(p)}/>
  <path fill="none" stroke="${p.ivica}" stroke-width="3" stroke-linejoin="round"
        d="M128 188 L300 322 L472 188"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".55"
        d="M128 412 L246 300 M472 412 L354 300"/>`;
}

/** Roll-up baner - uspravno platno sa postoljem. */
function rollup(p: Paleta): string {
  return `
  <rect x="196" y="70" width="208" height="386" rx="2" ${A(p)}/>
  <rect x="176" y="456" width="248" height="26" rx="8" fill="${p.ivica}"/>
  <rect x="192" y="482" width="216" height="12" rx="6" fill="${p.detalj}" opacity=".8"/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".5"
        d="M216 92 L384 92"/>`;
}

/** Fototapeta - zid sa sirokim panelom. */
function fototapeta(p: Paleta): string {
  return `
  <rect x="70" y="150" width="460" height="300" rx="2" ${A(p)}/>
  <path fill="none" stroke="${p.detalj}" stroke-width="2" opacity=".45"
        d="M223 150 L223 450 M377 150 L377 450"/>
  <path fill="none" stroke="${p.ivica}" stroke-width="2.5" opacity=".8"
        d="M70 450 L530 450"/>`;
}

/** Podrazumevani oblik, ako se pojavi potkategorija koju ne poznajemo. */
function list(p: Paleta): string {
  return `
  <rect x="180" y="140" width="240" height="320" rx="3" ${A(p)}/>`;
}

/**
 * Crtez po nazivu potkategorije.
 *
 * Poredi se po potkategoriji, a ne po sifri proizvoda: sifre su proizvoljne i
 * razlicite od stamparije do stamparije, a potkategorije su iz baze i fiksne.
 */
export const OBLICI: Record<string, (p: Paleta) => string> = {
  "Štampa na majicama": majica,
  "Štampa na duksevima": duks,
  "Šolje": solja,
  "Štampa na cegerima": cegera,
  "Posteri": poster,
  "Flajeri": flajer,
  "Vizit karte": vizitKarta,
  "Fascikle": fascikla,
  "Olovke": olovka,
  "Zahvalnice": zahvalnica,
  "Pozivnice": pozivnica,
  "Rollups": rollup,
  "Fototapete": fototapeta,
};

export function oblikZa(potkategorija: string): (p: Paleta) => string {
  return OBLICI[potkategorija] ?? list;
}
