import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { IInvoice } from "../models/Invoice";

/**
 * Pravljenje PDF dokumenata.
 *
 * Tekst zadatka izricito dozvoljava biblioteke za PDF: "Koriscenje dodatnih
 * biblioteka, kao sto su za pravljenje PDF dokumenata bilo na klijentskoj ili
 * serverskoj strani (...) je potpuno dozvoljeno i pozeljno."
 *
 * Izabran je pdfkit: cist JavaScript, bez izvornih zavisnosti koje bi se
 * kompajlirale pri instalaciji, pa se na odbrani instalira obicnim npm install.
 *
 * =========================== NASA SLOVA ===========================
 *
 * Ugradjeni PDF fontovi (Helvetica i ostali iz standardnih 14) koriste WinAnsi
 * kodiranje, koje pokriva Latin-1. Slova c, c, s, z i dj su u Latin-2 - dakle
 * NISU u tim fontovima. Da se pisalo ugradjenim fontom, "Šolja" bi izasla kao
 * "olja" ili bi generisanje puklo.
 *
 * Zato se ucitava TTF font sa sistema. Trazi se redom nekoliko fontova koji na
 * Windowsu uvek postoje; ako se nijedan ne nadje, pada se na Helvetica i to se
 * zapisuje u konzolu - dokument i dalje nastaje, samo bez dijakritike.
 */

const KANDIDATI_OBICNI = [
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/calibri.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

const KANDIDATI_MASNI = [
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/calibrib.ttf",
  "C:/Windows/Fonts/segoeuib.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

function nadjiFont(kandidati: string[]): string | null {
  for (const putanja of kandidati) {
    if (fs.existsSync(putanja)) return putanja;
  }
  return null;
}

const FONT = nadjiFont(KANDIDATI_OBICNI);
const FONT_MASNI = nadjiFont(KANDIDATI_MASNI);

if (!FONT) {
  console.warn(
    "PDF: nije pronađen sistemski TTF font. Dokumenti će biti bez naših slova.\n" +
      "     Očekivane putanje: " + KANDIDATI_OBICNI.join(", ")
  );
}

/** Boje iz dizajn sistema, da PDF izgleda kao ostatak aplikacije. */
const MASTILO = "#1A1815";
const BLAGO = "#8A8172";
const LINIJA = "#E4DCCA";
const MAGENTA = "#D6006E";

type Dokument = PDFKit.PDFDocument;

function noviDokument(naslov: string): Dokument {
  const dokument = new PDFDocument({ size: "A4", margin: 50, info: { Title: naslov } });

  if (FONT) dokument.registerFont("telo", FONT);
  if (FONT_MASNI) dokument.registerFont("masni", FONT_MASNI);

  return dokument;
}

/** Ime fonta koje pdfkit razume - ugradjeno ili nase registrovano. */
const telo = () => (FONT ? "telo" : "Helvetica");
const masni = () => (FONT_MASNI ? "masni" : "Helvetica-Bold");

/** Skuplja dokument u jedan Buffer, da moze i da se posalje i da se snimi. */
function uBafer(dokument: Dokument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const delovi: Buffer[] = [];
    dokument.on("data", (deo: Buffer) => delovi.push(deo));
    dokument.on("end", () => resolve(Buffer.concat(delovi)));
    dokument.on("error", reject);
    dokument.end();
  });
}

const dinara = (iznos: number) =>
  iznos.toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";

const datum = (kada: Date) =>
  kada.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Zaglavlje sa CMYK trakom - isti znak kao u aplikaciji. */
function zaglavlje(dokument: Dokument, nadnaslov: string, naslov: string): void {
  dokument.font(masni()).fontSize(20).fillColor(MASTILO).text("Printing House", 50, 50);

  // kontrolna CMYK traka
  const boje = ["#00A0C6", MAGENTA, "#F5C400", MASTILO];
  boje.forEach((boja, i) => {
    dokument.rect(50 + i * 22, 76, 22, 5).fill(boja);
  });

  dokument
    .font(telo())
    .fontSize(8)
    .fillColor(BLAGO)
    .text(nadnaslov.toUpperCase(), 50, 96, { characterSpacing: 1.5 });

  dokument.font(masni()).fontSize(17).fillColor(MASTILO).text(naslov, 50, 112);

  dokument.moveTo(50, 140).lineTo(545, 140).strokeColor(MASTILO).lineWidth(1).stroke();
  dokument.y = 158;
}

/** Jedan red tabele. Vraca visinu koju je zauzeo. */
function red(
  dokument: Dokument,
  y: number,
  celije: { tekst: string; x: number; sirina: number; desno?: boolean }[],
  opcije: { masno?: boolean; velicina?: number } = {}
): number {
  dokument.font(opcije.masno ? masni() : telo()).fontSize(opcije.velicina ?? 9);

  let najvisa = 0;
  for (const celija of celije) {
    const visina = dokument.heightOfString(celija.tekst, { width: celija.sirina });
    najvisa = Math.max(najvisa, visina);
    dokument.text(celija.tekst, celija.x, y, {
      width: celija.sirina,
      align: celija.desno ? "right" : "left",
    });
  }

  return najvisa;
}

function podnozje(dokument: Dokument, napomena: string): void {
  dokument
    .font(telo())
    .fontSize(7.5)
    .fillColor(BLAGO)
    // Dve linije napomene na y=780 prelaze A4 donju marginu (791px sa
    // marginom 50), pa PDFKit automatski otvara praznu drugu stranu. Footer
    // stoji dovoljno visoko da obe linije ostanu na prvoj strani.
    .text(napomena, 50, 758, { width: 495, align: "left" });
}

/* ==========================================================================
   Faktura
   ========================================================================== */

interface PodaciFakture {
  faktura: IInvoice;
  klijent: { firstName: string; lastName: string; email: string; institution?: { name?: string; address?: string; city?: string } };
  stampar: { institution?: { name?: string; address?: string; city?: string } };
}

/**
 * PDF fakture.
 *
 * Sve se cita IZ FAKTURE, a ne iz proizvoda: faktura je istorijski zapis i vec
 * nosi prepisane nazive i cene (vidi model Invoice). Zato PDF izgleda isto i
 * godinu dana kasnije, kada su cene odavno druge.
 */
export async function fakturaUPdf(podaci: PodaciFakture): Promise<Buffer> {
  const { faktura, klijent, stampar } = podaci;
  const dokument = noviDokument("Faktura " + faktura.number);

  zaglavlje(dokument, "Faktura · " + faktura.number, "Račun za štampu");

  // --- ko kome ------------------------------------------------------------
  let y = dokument.y;

  dokument.font(telo()).fontSize(8).fillColor(BLAGO);
  dokument.text("IZDAVALAC", 50, y, { characterSpacing: 1.2 });
  dokument.text("PRIMALAC", 310, y, { characterSpacing: 1.2 });

  y += 14;
  dokument.font(masni()).fontSize(10).fillColor(MASTILO);
  dokument.text(stampar.institution?.name ?? "—", 50, y, { width: 240 });
  dokument.text(
    klijent.institution?.name ?? `${klijent.firstName} ${klijent.lastName}`,
    310,
    y,
    { width: 235 }
  );

  y += 16;
  dokument.font(telo()).fontSize(9).fillColor(BLAGO);
  dokument.text(
    [stampar.institution?.address, stampar.institution?.city].filter(Boolean).join(", "),
    50,
    y,
    { width: 240 }
  );
  dokument.text(
    klijent.institution
      ? [klijent.institution.address, klijent.institution.city].filter(Boolean).join(", ")
      : klijent.email,
    310,
    y,
    { width: 235 }
  );

  y += 30;
  dokument.font(telo()).fontSize(9).fillColor(MASTILO);
  dokument.text("Datum izdavanja: " + datum(faktura.createdAt), 50, y);
  dokument.text("Status: " + NAZIV_STATUSA[faktura.status], 310, y);

  // --- stavke -------------------------------------------------------------
  y += 30;
  dokument.moveTo(50, y).lineTo(545, y).strokeColor(MASTILO).lineWidth(0.8).stroke();
  y += 8;

  const kolone = [
    { x: 50, sirina: 30 },
    { x: 82, sirina: 200 },
    { x: 288, sirina: 100 },
    { x: 392, sirina: 40, desno: true },
    { x: 436, sirina: 50, desno: true },
    { x: 490, sirina: 55, desno: true },
  ];

  dokument.fillColor(BLAGO);
  red(
    dokument,
    y,
    [
      { tekst: "Šifra", ...kolone[0] },
      { tekst: "Proizvod", ...kolone[1] },
      { tekst: "Štampa", ...kolone[2] },
      { tekst: "Kol.", ...kolone[3] },
      { tekst: "Cena", ...kolone[4] },
      { tekst: "Ukupno", ...kolone[5] },
    ],
    { masno: true, velicina: 8 }
  );

  y += 16;
  dokument.moveTo(50, y).lineTo(545, y).strokeColor(LINIJA).lineWidth(0.6).stroke();
  y += 8;

  dokument.fillColor(MASTILO);
  for (const stavka of faktura.items) {
    const stampa = [stavka.printType, stavka.printText ? `„${stavka.printText}“` : ""]
      .filter(Boolean)
      .join(" · ");

    const visina = red(dokument, y, [
      { tekst: stavka.code, ...kolone[0] },
      { tekst: `${stavka.name}\nboja: ${stavka.color}`, ...kolone[1] },
      { tekst: stampa || "—", ...kolone[2] },
      { tekst: String(stavka.quantity), ...kolone[3] },
      { tekst: dinara(stavka.unitPrice + stavka.extraPricePerPiece), ...kolone[4] },
      { tekst: dinara(stavka.lineTotal), ...kolone[5] },
    ]);

    y += visina + 10;
    dokument.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor(LINIJA).lineWidth(0.5).stroke();

    // Nova strana ako se blizi dnu.
    if (y > 700) {
      dokument.addPage();
      y = 60;
    }
  }

  // --- zbir ---------------------------------------------------------------
  y += 8;
  dokument.moveTo(340, y).lineTo(545, y).strokeColor(MASTILO).lineWidth(1).stroke();
  y += 10;

  dokument.font(masni()).fontSize(13).fillColor(MASTILO);
  dokument.text("UKUPNO", 340, y, { width: 100 });
  dokument.text(dinara(faktura.total), 440, y, { width: 105, align: "right" });

  podnozje(
    dokument,
    "Dokument je generisan automatski i važi bez pečata i potpisa.\n" +
      "Printing House · " + new Date().getFullYear()
  );

  return uBafer(dokument);
}

/* ==========================================================================
   Izvestaj o javnoj nabavci
   ========================================================================== */

interface PodaciIzvestaja {
  nabavka: {
    number: string;
    createdAt: Date;
    deadline: Date;
    status: string;
    items: { name: string; categoryName: string; quantity: number }[];
    winnerBidId?: unknown;
    winnerTotal?: number;
    failureReason?: string;
  };
  ustanova: { name: string };
  ponude: {
    _id: unknown;
    total: number;
    createdAt: Date;
    printerName: string;
    lines: { productName: string; productCode: string; unitPrice: number; quantity: number }[];
  }[];
}

/**
 * PDF izvestaj o zavrsenoj licitaciji.
 *
 * Tekst zadatka: "svaka ustanova dobija u svom odeljku za javne nabavke PDF
 * izvestaj o SVIM POSLATIM PONUDAMA I ONOJ KOJA JE DOBILA javnu nabavku
 * (imala ponudu najnizeg iznosa)". Zato su ovde sve ponude, poredjane po
 * iznosu, a pobednicka je posebno oznacena.
 */
export async function izvestajUPdf(podaci: PodaciIzvestaja): Promise<Buffer> {
  const { nabavka, ustanova, ponude } = podaci;
  const dokument = noviDokument("Izveštaj " + nabavka.number);

  zaglavlje(dokument, "Javna nabavka · " + nabavka.number, "Izveštaj o licitaciji");

  let y = dokument.y;

  dokument.font(telo()).fontSize(9).fillColor(MASTILO);
  dokument.text("Naručilac: " + ustanova.name, 50, y);
  y += 14;
  dokument.text(
    "Raspisana: " + datum(nabavka.createdAt) + " · rok istekao: " + datum(nabavka.deadline),
    50,
    y
  );
  y += 14;
  dokument.text("Pristiglih ponuda: " + ponude.length, 50, y);

  // --- sta se trazilo -----------------------------------------------------
  y += 26;
  dokument.font(masni()).fontSize(10).fillColor(MASTILO).text("Traženi proizvodi", 50, y);
  y += 18;

  dokument.font(telo()).fontSize(9);
  for (const stavka of nabavka.items) {
    dokument.text(`• ${stavka.name} — ${stavka.quantity} kom (${stavka.categoryName})`, 60, y, {
      width: 485,
    });
    y += 14;
  }

  // --- ishod --------------------------------------------------------------
  y += 12;
  const pobednicka = ponude.find((p) => String(p._id) === String(nabavka.winnerBidId));

  if (pobednicka) {
    dokument.rect(50, y, 495, 44).fillAndStroke("#F2F6F3", "#1F7A4C");
    dokument.font(masni()).fontSize(10).fillColor("#1F7A4C");
    dokument.text("Nabavku je dobila: " + pobednicka.printerName, 62, y + 10, { width: 470 });
    dokument.font(telo()).fontSize(9).fillColor(MASTILO);
    dokument.text("Ukupan iznos ponude: " + dinara(pobednicka.total), 62, y + 26, { width: 470 });
    y += 60;
  } else {
    dokument.rect(50, y, 495, 34).fillAndStroke("#FBF4F2", "#9A3B22");
    dokument.font(telo()).fontSize(9).fillColor("#9A3B22");
    dokument.text(nabavka.failureReason ?? "Nabavka nije dodeljena.", 62, y + 11, { width: 470 });
    y += 50;
  }

  // --- sve ponude ---------------------------------------------------------
  dokument.font(masni()).fontSize(10).fillColor(MASTILO).text("Sve pristigle ponude", 50, y);
  y += 20;

  const kolone = [
    { x: 50, sirina: 24 },
    { x: 76, sirina: 170 },
    { x: 250, sirina: 200 },
    { x: 452, sirina: 93, desno: true },
  ];

  dokument.fillColor(BLAGO);
  red(
    dokument,
    y,
    [
      { tekst: "#", ...kolone[0] },
      { tekst: "Štamparija", ...kolone[1] },
      { tekst: "Ponuđeni proizvodi", ...kolone[2] },
      { tekst: "Ukupno", ...kolone[3] },
    ],
    { masno: true, velicina: 8 }
  );

  y += 16;
  dokument.moveTo(50, y).lineTo(545, y).strokeColor(LINIJA).lineWidth(0.6).stroke();
  y += 8;

  ponude.forEach((ponuda, redni) => {
    const jePobednik = String(ponuda._id) === String(nabavka.winnerBidId);

    dokument.fillColor(jePobednik ? "#1F7A4C" : MASTILO);

    const visina = red(
      dokument,
      y,
      [
        { tekst: String(redni + 1), ...kolone[0] },
        {
          tekst: ponuda.printerName + (jePobednik ? "\n✓ dobila nabavku" : ""),
          ...kolone[1],
        },
        {
          tekst: ponuda.lines
            .map((l) => `${l.productName} (${l.productCode}) — ${dinara(l.unitPrice)} × ${l.quantity}`)
            .join("\n"),
          ...kolone[2],
        },
        { tekst: dinara(ponuda.total), ...kolone[3] },
      ],
      { masno: jePobednik }
    );

    y += visina + 10;
    dokument.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor(LINIJA).lineWidth(0.5).stroke();

    if (y > 700) {
      dokument.addPage();
      y = 60;
    }
  });

  podnozje(
    dokument,
    "Ponude su poređane po ukupnom iznosu. Nabavku dobija najniža ponuda koja je u\n" +
      "trenutku isteka roka imala dovoljne količine svih traženih proizvoda na stanju."
  );

  return uBafer(dokument);
}

/** Nazivi statusa - isti kao u aplikaciji. */
const NAZIV_STATUSA: Record<string, string> = {
  ORDERED: "naručeno",
  PAID: "plaćeno",
  PRINTING: "u štampi",
  DELIVERED: "isporučeno",
  RECEIVED: "primljeno",
  CANCELLED: "otkazano",
};

/** Da li je pronadjen font sa nasim slovima - server to javi pri pokretanju. */
export const IMA_FONT = !!FONT;

/** Putanja pronadjenog fonta, za poruku u konzoli. */
export const PUTANJA_FONTA = FONT ? path.basename(FONT) : "(nije pronađen)";
