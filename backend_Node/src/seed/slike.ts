import fs from "fs";
import path from "path";

/**
 * Uzorci slika za popunjenu bazu.
 *
 * Prave slike proizvoda stampari otpremaju kroz aplikaciju. Ovde se prave
 * jednostavni SVG uzorci, da bi galerija i spiskovi imali sta da prikazu.
 * SVG je izabran jer je obican tekst - ne treba nikakva biblioteka za obradu
 * slika, a prikaz ostaje ostar na svakoj velicini.
 */

const KOREN = path.join(__dirname, "..", "..", "uploads");

// 1x1 JPEG - podrazumevana profilna slika koju tekst zadatka imenuje
const PRAZAN_JPEG =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy" +
  "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA" +
  "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA" +
  "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3" +
  "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm" +
  "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA" +
  "AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx" +
  "BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK" +
  "U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3" +
  "uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iii" +
  "gD//2Q==";

/** Jedan uzorak: boja podloge, oznaka i naziv proizvoda. */
function svgUzorak(naziv: string, oznaka: string, podloga: string, mastilo: string): string {
  const kratko = naziv.length > 26 ? naziv.slice(0, 25) + "…" : naziv;

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">',
    `  <rect width="600" height="600" fill="${podloga}"/>`,
    // registarski markovi u uglovima, isti jezik kao na obrascima
    `  <g stroke="${mastilo}" stroke-width="2" opacity="0.35" fill="none">`,
    '    <path d="M28 60 V28 H60"/><path d="M540 28 H572 V60"/>',
    '    <path d="M572 540 V572 H540"/><path d="M60 572 H28 V540"/>',
    "  </g>",
    `  <text x="300" y="286" text-anchor="middle" fill="${mastilo}"`,
    '        font-family="Georgia, serif" font-size="40">' + kratko + "</text>",
    `  <text x="300" y="330" text-anchor="middle" fill="${mastilo}" opacity="0.6"`,
    '        font-family="monospace" font-size="20" letter-spacing="4">' + oznaka + "</text>",
    // kontrolna CMYK traka na dnu
    '  <g><rect x="230" y="500" width="35" height="8" fill="#00A0C6"/>',
    '     <rect x="265" y="500" width="35" height="8" fill="#D6006E"/>',
    '     <rect x="300" y="500" width="35" height="8" fill="#F5C400"/>',
    '     <rect x="335" y="500" width="35" height="8" fill="#1A1815"/></g>',
    "</svg>",
  ].join("\n");
}

const PODLOGE = [
  ["#EFEAE0", "#1A1815"],
  ["#E4E9EC", "#123A45"],
  ["#EDE6EC", "#4A1030"],
  ["#EFEDE0", "#3D3405"],
];

/**
 * Pravi uzorke slika i vraca putanje koje se upisuju u bazu.
 * Za svaki proizvod: glavna slika + dve dodatne za galeriju.
 */
export function napraviUzorkeSlika(
  proizvodi: { code: string; name: string }[]
): Record<string, { glavna: string; dodatne: string[] }> {
  for (const folder of [KOREN, path.join(KOREN, "profile"), path.join(KOREN, "product")]) {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  }

  fs.writeFileSync(
    path.join(KOREN, "default_profile_image.jpg"),
    Buffer.from(PRAZAN_JPEG, "base64")
  );

  const rezultat: Record<string, { glavna: string; dodatne: string[] }> = {};

  proizvodi.forEach((proizvod, redni) => {
    const putanje: string[] = [];

    for (let varijanta = 0; varijanta < 3; varijanta++) {
      const [podloga, mastilo] = PODLOGE[(redni + varijanta) % PODLOGE.length];
      const ime = `${proizvod.code.toLowerCase()}-${varijanta + 1}.svg`;

      fs.writeFileSync(
        path.join(KOREN, "product", ime),
        svgUzorak(proizvod.name, `${proizvod.code} · ${varijanta + 1}/3`, podloga, mastilo),
        "utf8"
      );

      putanje.push(`product/${ime}`);
    }

    rezultat[proizvod.code] = { glavna: putanje[0], dodatne: putanje.slice(1) };
  });

  // podrazumevana slika proizvoda, za one bez otpremljene slike
  fs.writeFileSync(
    path.join(KOREN, "default_product_image.svg"),
    svgUzorak("Bez slike", "PH", "#EFEAE0", "#1A1815"),
    "utf8"
  );

  return rezultat;
}
