import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

/**
 * Slanje i-mejl poruka.
 *
 * Tekst zadatka: "Nakon formiranja, fakturu/e dostaviti kao PDF fajl(ove)
 * klijentu na i-mejl." Biblioteke za automatizovano slanje poste su izricito
 * dozvoljene, pa se koristi nodemailer.
 *
 * =========================== ZASTO ETHEREAL ===========================
 *
 * Slanje prave poste trazi nalog na nekom SMTP serveru. Gmail bi trazio tudju
 * lozinku za aplikaciju i dvofaktorsku potvrdu, a fakultetska mreza cesto
 * blokira odlazni SMTP - dakle tacno ono sto ne sme da zakaze na odbrani.
 *
 * Ethereal je nodemailer-ov nalog za probu: pravi se sam, bez registracije, i
 * poruka se ne isporucuje nikome nego ostaje na njihovom sajtu, na adresi koja
 * se dobije uz odgovor. Na odbrani se klikne na tu adresu i vidi se poslata
 * poruka sa PDF prilogom - sto je upravo ono sto treba pokazati.
 *
 * Ako se zeli prava posta, dovoljno je popuniti SMTP_* promenljive u .env i
 * nista drugo se ne menja.
 *
 * =========================== AKO NEMA MREZE ===========================
 *
 * Ethereal trazi internet. Zato slanje NIKADA ne obara posao zbog kojeg je
 * pozvano: ako ne uspe, faktura je vec izdata i PDF se i dalje moze preuzeti
 * sa strane. Isto obrazloženje kao kod linka za ponistavanje lozinke u PH-004 -
 * posta je pogodnost, a ne uslov.
 */

export interface Prilog {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface IshodSlanja {
  sent: boolean;
  /** Adresa na kojoj se poslata poruka moze pogledati (samo Ethereal). */
  previewUrl?: string;
  /** Zasto nije poslato, ako nije. */
  reason?: string;
}

/**
 * Posiljalac se pravi jednom i cuva.
 * Ethereal nalog se pravi pri prvom slanju, ne pri pokretanju servera - da
 * server radi i bez mreze.
 */
let posiljalac: Transporter | null = null;
let jeEthereal = false;

async function nabaviPosiljaoca(): Promise<Transporter> {
  if (posiljalac) return posiljalac;

  // Prava posta, ako je podeseno u .env
  if (env.smtpHost && env.smtpUser) {
    posiljalac = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
    jeEthereal = false;
    return posiljalac;
  }

  // Inace nalog za probu, koji se pravi sam.
  const nalog = await nodemailer.createTestAccount();

  posiljalac = nodemailer.createTransport({
    host: nalog.smtp.host,
    port: nalog.smtp.port,
    secure: nalog.smtp.secure,
    auth: { user: nalog.user, pass: nalog.pass },
  });

  jeEthereal = true;
  console.log("Pošta: napravljen Ethereal nalog za probu (" + nalog.user + ")");

  return posiljalac;
}

/**
 * Salje poruku i vraca ishod. NIKADA ne baca izuzetak.
 *
 * Pozivaoci su mesta na kojima se dogodilo nesto vaznije od poruke - izdata je
 * faktura, zakljucena licitacija. Da slanje baca, neuspelo slanje bi obaralo
 * posao koji je vec uspeo.
 */
export async function posalji(
  primalac: string,
  naslov: string,
  tekst: string,
  prilozi: Prilog[] = []
): Promise<IshodSlanja> {
  try {
    const veza = await nabaviPosiljaoca();

    const poruka = await veza.sendMail({
      from: env.mailFrom,
      to: primalac,
      subject: naslov,
      text: tekst,
      attachments: prilozi,
    });

    return {
      sent: true,
      previewUrl: jeEthereal
        ? (nodemailer.getTestMessageUrl(poruka) as string) || undefined
        : undefined,
    };
  } catch (greska) {
    const razlog = greska instanceof Error ? greska.message : String(greska);
    console.error("Slanje pošte nije uspelo:", razlog);
    return { sent: false, reason: razlog };
  }
}
