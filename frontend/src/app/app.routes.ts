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

  // Prijava i registracija dele istu komponentu - to je jedan uredjaj sa dva
  // obrasca, pa je i u kodu jedna strana sa dva rezima.
  {
    path: 'pristup',
    loadComponent: () => import('./pristup/pristup').then((m) => m.Pristup),
  },
  {
    path: 'registracija',
    loadComponent: () => import('./pristup/pristup').then((m) => m.Pristup),
    data: { rezim: 'registracija' },
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

  { path: '**', redirectTo: '' },
];
