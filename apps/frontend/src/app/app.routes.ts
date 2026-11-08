import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Momap — Felfedezés és digitális vendégtérképek',
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
    path: 'access/:vertical/guides/new',
    title: 'Új vendégtérkép — Momap',
    loadComponent: () => import('./features/access/guide-editor.component').then(m => m.GuideEditorComponent),
  },
  {
    path: 'access/:vertical/guides/:id',
    title: 'Vendégtérkép szerkesztése — Momap',
    loadComponent: () => import('./features/access/guide-editor.component').then(m => m.GuideEditorComponent),
  },
  {
    path: 'access/:vertical',
    title: 'Momap Access — Partner és admin felület',
    loadComponent: () => import('./features/access/access.component').then(m => m.AccessComponent),
  },
  { path:'adatvedelem',title:'Adatkezelés – Momap',data:{kind:'privacy'},loadComponent:()=>import('./features/legal/legal-page.component').then(m=>m.LegalPageComponent) },
  { path:'sutik',title:'Sütikezelés – Momap',data:{kind:'cookies'},loadComponent:()=>import('./features/legal/legal-page.component').then(m=>m.LegalPageComponent) },
  { path:'impresszum',title:'Impresszum – Momap',data:{kind:'imprint'},loadComponent:()=>import('./features/legal/legal-page.component').then(m=>m.LegalPageComponent) },
  { path: '**', redirectTo: '' },
];
