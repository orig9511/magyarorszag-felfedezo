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
  { path: '**', redirectTo: '' },
];
