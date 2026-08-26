/**
 * Otvaranje PDF-a koji je stigao sa servera.
 *
 * Server šalje sadržaj, a ne adresu — zahtev mora da prođe kroz interceptor
 * koji dodaje token (vidi InvoiceService.pdf). Ono što se dobije je blob, pa se
 * ovde od njega pravi privremena adresa i otvara u novom jezičku.
 *
 * Adresa se oslobađa posle minut: da se oslobodi odmah, neki pregledači bi
 * zatvorili jezičak pre nego što stignu da prikažu dokument.
 */
export function otvoriPdf(sadrzaj: Blob, imeFajla: string): void {
  const adresa = URL.createObjectURL(sadrzaj);
  const prozor = window.open(adresa, '_blank');

  // Ako je pregledač blokirao iskačući prozor, pada se na preuzimanje - da
  // korisnik u svakom slučaju dobije dokument.
  if (!prozor) {
    const veza = document.createElement('a');
    veza.href = adresa;
    veza.download = imeFajla;
    veza.click();
  }

  setTimeout(() => URL.revokeObjectURL(adresa), 60_000);
}
