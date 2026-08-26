import { Routes } from '@angular/router';
import { rolaGuard } from './services/auth.guard';

export const routes: Routes = [
  // --- javno dostupno -----------------------------------------------------
  {
    path: '',
    loadComponent: () => import('./pocetna/pocetna').then((m) => m.Pocetna),
  },
  {
    path: 'proizvod/:id',
    loadComponent: () => import('./proizvod/proizvod').then((m) => m.Proizvod),
  },

  // Prijava i registracija su DVE rute i dve komponente. Ranije su delile
  // jednu komponentu, a prelazilo se dugmadima na ploci stampaca - adresa se
  // pri tome nije menjala, pa je /registracija mogla da prikazuje prijavu, a
  // dugme "nazad" u pregledacu nije vracalo na prethodni obrazac.
  {
    path: 'prijava',
    loadComponent: () => import('./prijava/prijava').then((m) => m.Prijava),
  },
  {
    path: 'registracija',
    loadComponent: () => import('./registracija/registracija').then((m) => m.Registracija),
  },

  {
    path: 'zaboravljena-lozinka',
    loadComponent: () =>
      import('./zaboravljena-lozinka/zaboravljena-lozinka').then((m) => m.ZaboravljenaLozinka),
  },
  {
    path: 'reset-lozinke/:token',
    loadComponent: () => import('./nova-lozinka/nova-lozinka').then((m) => m.NovaLozinka),
  },

  // --- svi prijavljeni ------------------------------------------------------
  // Profil je jedna strana za sve uloge: razlika je samo u tome sto pravno lice
  // i stamparija imaju i podatke o instituciji.
  {
    path: 'profil',
    canActivate: [rolaGuard()],
    loadComponent: () => import('./profil/profil').then((m) => m.Profil),
  },

  // --- klijent ---------------------------------------------------------------
  {
    path: 'klijent/pretraga',
    canActivate: [rolaGuard('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY')],
    loadComponent: () =>
      import('./klijent-pretraga/klijent-pretraga').then((m) => m.KlijentPretraga),
  },
  {
    path: 'klijent/korpa',
    canActivate: [rolaGuard('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY')],
    loadComponent: () => import('./klijent-korpa/klijent-korpa').then((m) => m.KlijentKorpa),
  },
  {
    path: 'klijent/narudzbine',
    canActivate: [rolaGuard('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY')],
    loadComponent: () =>
      import('./klijent-narudzbine/klijent-narudzbine').then((m) => m.KlijentNarudzbine),
  },
  {
    path: 'klijent/nabavke',
    canActivate: [rolaGuard('CLIENT_COMPANY')],
    loadComponent: () => import('./klijent-nabavke/klijent-nabavke').then((m) => m.KlijentNabavke),
  },
  {
    path: 'klijent/arhiva',
    canActivate: [rolaGuard('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY')],
    loadComponent: () => import('./klijent-arhiva/klijent-arhiva').then((m) => m.KlijentArhiva),
  },
  {
    path: 'klijent/priprema/:id',
    canActivate: [rolaGuard('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY')],
    loadComponent: () =>
      import('./klijent-priprema/klijent-priprema').then((m) => m.KlijentPriprema),
  },
  {
    path: 'klijent/proizvod/:id',
    canActivate: [rolaGuard('CLIENT_INDIVIDUAL', 'CLIENT_COMPANY')],
    loadComponent: () =>
      import('./klijent-proizvod/klijent-proizvod').then((m) => m.KlijentProizvod),
  },

  // --- stampar ---------------------------------------------------------------
  {
    path: 'stampar/proizvodi',
    canActivate: [rolaGuard('PRINTER')],
    loadComponent: () =>
      import('./stampar-proizvodi/stampar-proizvodi').then((m) => m.StamparProizvodi),
  },
  {
    path: 'stampar/narudzbine',
    canActivate: [rolaGuard('PRINTER')],
    loadComponent: () =>
      import('./stampar-narudzbine/stampar-narudzbine').then((m) => m.StamparNarudzbine),
  },
  {
    path: 'stampar/licitacije',
    canActivate: [rolaGuard('PRINTER')],
    loadComponent: () =>
      import('./stampar-licitacije/stampar-licitacije').then((m) => m.StamparLicitacije),
  },
  {
    path: 'stampar/novi-proizvod',
    canActivate: [rolaGuard('PRINTER')],
    loadComponent: () =>
      import('./stampar-novi-proizvod/stampar-novi-proizvod').then((m) => m.StamparNoviProizvod),
  },
  {
    path: 'stampar/uvoz',
    canActivate: [rolaGuard('PRINTER')],
    loadComponent: () => import('./stampar-uvoz/stampar-uvoz').then((m) => m.StamparUvoz),
  },

  // --- administrator ------------------------------------------------------
  // Prijava administratora je na posebnoj ruti i nigde nije povezana linkom
  // sa javnog dela sajta - tako trazi tekst zadatka.
  {
    path: 'admin/prijava',
    loadComponent: () => import('./admin-prijava/admin-prijava').then((m) => m.AdminPrijava),
  },
  {
    path: 'admin/zahtevi',
    canActivate: [rolaGuard('ADMIN')],
    loadComponent: () => import('./admin-zahtevi/admin-zahtevi').then((m) => m.AdminZahtevi),
  },
  {
    path: 'admin/korisnici',
    canActivate: [rolaGuard('ADMIN')],
    loadComponent: () =>
      import('./admin-korisnici/admin-korisnici').then((m) => m.AdminKorisnici),
  },
  {
    path: 'admin/kategorije',
    canActivate: [rolaGuard('ADMIN')],
    loadComponent: () =>
      import('./admin-kategorije/admin-kategorije').then((m) => m.AdminKategorije),
  },
  {
    path: 'admin/statistika',
    canActivate: [rolaGuard('ADMIN')],
    loadComponent: () =>
      import('./admin-statistika/admin-statistika').then((m) => m.AdminStatistika),
  },

  { path: '**', redirectTo: '' },
];
