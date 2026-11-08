import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import maplibregl from 'maplibre-gl';
import { MAP_STYLE } from '../../core/config/map-style';

interface GuestGuide {
  slug: string;
  branding: { title: string; accentColor: string; logoUrl?: string };
  map: { center: [number, number]; zoom: number };
  categories: string[];
  poiIds: string[];
  eventIds: string[];
}

/**
 * Read-only pilot: loads published guide configuration.
 * The backend does not yet expose curated public POI/event details, so no
 * placeholder markers or fabricated locations are rendered.
 */
@Component({
  selector: 'app-guest-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="guest-page">
      <header class="guest-header">
        <a routerLink="/" aria-label="Momap főoldal">Momap</a>
        <span>Vendégtérkép</span>
      </header>
      <section *ngIf="loading" role="status" class="guest-state">Térkép betöltése…</section>
      <section *ngIf="error" role="alert" class="guest-state">{{ error }}</section>
      <ng-container *ngIf="guide">
        <div class="guest-title">
          <img *ngIf="guide.branding.logoUrl" [src]="guide.branding.logoUrl" alt="" width="44" height="44" referrerpolicy="no-referrer" />
          <div><p>Fedezd fel a környéket</p><h1>{{ guide.branding.title }}</h1></div>
        </div>
        <p class="guest-note">A kiválasztott helyszínek és események megjelenítése a következő fejlesztési lépésben érkezik.</p>
        <div #mapHost class="guest-map" role="region" aria-label="A vendégtérkép térképi nézete"></div>
        <footer>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></footer>
      </ng-container>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#101812; color:#f5f7f3; font-family:inherit; }
    .guest-page { max-width:1300px; margin:auto; padding:1rem; }
    .guest-header { display:flex; justify-content:space-between; align-items:center; padding:.75rem 0; border-bottom:1px solid #3c483e; }
    a { color:inherit; }
    .guest-title { display:flex; align-items:center; gap:1rem; margin:1.25rem 0; }
    .guest-title h1 { margin:.1rem 0; font-size:clamp(1.6rem,4vw,2.8rem); }
    .guest-title p { margin:0; color:#c3cfc4; }
    .guest-title img { object-fit:contain; }
    .guest-note { color:#c3cfc4; }
    .guest-map { width:100%; height:min(70vh,720px); min-height:360px; border-radius:16px; overflow:hidden; }
    .guest-state { padding:3rem 1rem; }
    footer { margin:1rem 0; font-size:.8rem; color:#c3cfc4; }
  `],
})
export class GuestGuideComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost') mapHost?: ElementRef<HTMLElement>;
  loading = true;
  error = '';
  guide?: GuestGuide;
  private map?: maplibregl.Map;
  private observer?: ResizeObserver;
  private destroyed = false;

  constructor(private readonly route: ActivatedRoute) {}

  async ngAfterViewInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      this.loading = false; this.error = 'Érvénytelen vendégtérkép-hivatkozás.'; return;
    }
    try {
      const response = await fetch('/api/guides/public/' + encodeURIComponent(slug), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(response.status === 404 ? 'A vendégtérkép nem található.' : 'A vendégtérkép jelenleg nem érhető el.');
      const guide: GuestGuide = await response.json();
      if (this.destroyed) return;
      this.guide = guide;
      this.loading = false;
      // ngIf creates the host in the next Angular render cycle.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (this.destroyed || !this.mapHost) return;
      this.map = new maplibregl.Map({
        container: this.mapHost.nativeElement, style: MAP_STYLE,
        center: guide.map.center, zoom: guide.map.zoom, renderWorldCopies: false,
      });
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      this.observer = new ResizeObserver(() => this.map?.resize());
      this.observer.observe(this.mapHost.nativeElement);
    } catch (error) {
      if (this.destroyed) return;
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Hiba történt.';
    }
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.map?.remove();
  }
}
