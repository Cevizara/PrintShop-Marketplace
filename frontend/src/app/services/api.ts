/** Adresa serverskog dela. Na jednom mestu, da se menja samo ovde. */
export const API = 'http://localhost:4000';

/** Puna putanja do otpremljene slike. */
export function slikaUrl(putanja: string | undefined | null): string {
  if (!putanja) return API + '/uploads/default_product_image.svg';
  return API + '/uploads/' + putanja;
}
