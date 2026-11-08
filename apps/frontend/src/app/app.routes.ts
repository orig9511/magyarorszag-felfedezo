import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Momap — Magyarország, amit még nem ismersz',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    // Lazy: MapLibre (the bulk of the bundle) is only downloaded when the explorer is opened.
    path: 'explore',
    title: 'Térkép — Momap',
    loadComponent: () => import('./features/explore/explore.component').then((m) => m.ExploreComponent),
  },
  {
    path: 'g/:slug',
    title: 'Vendégtérkép — Momap',
    loadComponent: () => import('./features/guest-guide/guest-guide.component').then(m => m.GuestGuideComponent),
  },
  {
    path: 'access/:vertical',
    title: 'Momap Access — Partner és admin felület',
    loadComponent: () => import('./features/access/access.component').then(m => m.AccessComponent),
  },
  {
    path: 'access/:vertical/guides/new',
    title: 'Új vendégtérkép — Momap',
    loadComponent: () => import('./features/access/guide-editor.component').then(m => m.GuideEditorComponent),
  },
  {
    path: 'access/:vertical/guides/:id',
    title: 'Vendégtérkép szerkesztése — Momap',
    loadComponent: () => import('./features/access/guide-editor.component').then(m => m.GuideEditorComponent),
  },
  { path: '**', redirectTo: '' },
];
