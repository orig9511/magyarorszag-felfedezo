import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuideQrComponent } from '../../shared/guide-qr/guide-qr.component';
import { ActivatedRoute, RouterLink } from '@angular/router';
import maplibregl from 'maplibre-gl';
import { MAP_STYLE } from '../../core/config/map-style';

interface GuestPlace {id:string;kind:'poi'|'event';title:string;description:string|null;category:string;coordinates:[number,number];address?:string|null;attribution?:string|null;startTime?:string|null;}
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
  imports: [CommonModule, GuideQrComponent, RouterLink],
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
        <div class="guest-sharing"><button type="button" (click)="showQr=!showQr">{{showQr?'QR-kód bezárása':'QR-kód'}}</button>
          <button type="button" (click)="shareGuide()">Megosztás</button>
          <button type="button" (click)="copyGuideLink()">Link másolása</button>
          <span *ngIf="shareMessage" role="status">{{shareMessage}}</span>
        </div>
        <app-guide-qr *ngIf="showQr && guide" [url]="guideUrl()" [filename]="guide.slug" />
        <div class="guest-controls"><button (click)="selectedCategory='all';renderPlaces()" [class.active]="selectedCategory==='all'">Összes</button><button *ngFor="let cat of categories" (click)="selectedCategory=cat;renderPlaces()" [class.active]="selectedCategory===cat">{{cat}}</button></div>
        <p class="guest-note" *ngIf="places.length===0">Ehhez a térképhez még nincs megjeleníthető helyszín.</p>
        <div class="guest-layout">
        <div class="guest-list"><button class="guest-place" *ngFor="let place of filteredPlaces" (click)="focusPlace(place)">
          <strong>{{place.title}}</strong><small>{{place.kind==='event'?'Esemény':place.category}}</small>
          <span *ngIf="place.address">{{place.address}}</span>
          <span *ngIf="place.attribution">Forrás: {{place.attribution}}</span>
        </button></div>
        <div #mapHost class="guest-map" role="region" aria-label="A vendégtérkép térképi nézete"></div>
        </div>
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
    .guest-layout{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:12px}
    .guest-list{max-height:70vh;overflow:auto;display:flex;flex-direction:column;gap:8px}
    .guest-place{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:6px;background:#1d2b21;border:1px solid #3b5140;border-radius:12px;padding:14px;color:#fff;cursor:pointer}
    .guest-place small,.guest-place span{color:#b5cab9}
    .guest-sharing{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:1rem}
    .guest-sharing button{border:1px solid #52795d;background:#254332;color:#e8f5e7;border-radius:9px;padding:10px 14px;cursor:pointer}
    .guest-sharing span{font-size:.85rem;color:#c4e7c7}
    .guest-controls{display:flex;gap:8px;overflow:auto;padding:12px 0}
    .guest-controls button{white-space:nowrap;border:1px solid #48634e;background:#203126;color:#e3f5e5;padding:9px 14px;border-radius:30px;cursor:pointer}
    .guest-controls button.active{background:#c0e9b6;color:#152219}
    .guest-map { width:100%; height:min(70vh,720px); min-height:360px; border-radius:16px; overflow:hidden; }
    @media(max-width:700px){.guest-layout{grid-template-columns:1fr}.guest-list{max-height:210px}.guest-map{height:60vh}}
    .guest-state { padding:3rem 1rem; }
    footer { margin:1rem 0; font-size:.8rem; color:#c3cfc4; }
  `],
})
export class GuestGuideComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost') mapHost?: ElementRef<HTMLElement>;
  loading = true;
  error = '';
  guide?: GuestGuide;
  places: GuestPlace[] = [];
  selectedCategory = 'all';
  shareMessage = '';
  showQr = false;
  guideUrl():string { return new URL('/g/'+encodeURIComponent(this.guide!.slug),window.location.origin).href; }
  async copyGuideLink():Promise<void>{
    if(!this.guide)return;
    try{await navigator.clipboard.writeText(this.guideUrl());this.shareMessage='A vendégtérkép hivatkozása másolva.';}
    catch{this.shareMessage='A hivatkozás másolása nem sikerült.';}
  }
  async shareGuide():Promise<void>{
    if(!this.guide)return;
    const url=this.guideUrl();
    if(typeof navigator.share!=='function'){await this.copyGuideLink();return;}
    try{await navigator.share({title:this.guide.branding.title,text:'Fedezd fel a környék ajánlott helyeit!',url});this.shareMessage='';}
    catch(e){if((e as Error)?.name!=='AbortError')this.shareMessage='A megosztás nem sikerült.';}
  }
  private markers: maplibregl.Marker[] = [];
  get categories(): string[] { return [...new Set(this.places.map(p => p.kind==='event'?'event':p.category))]; }
  get filteredPlaces(): GuestPlace[] { return this.places.filter(p=>this.selectedCategory==='all'||(p.kind==='event'?'event':p.category)===this.selectedCategory); }
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
      const placesResponse = await fetch('/api/guides/public/' + encodeURIComponent(slug) + '/places');
      if (placesResponse.ok) { const payload: {places:GuestPlace[]} = await placesResponse.json(); this.places=payload.places; }
      if (this.destroyed) return;
      this.loading = false;
      // ngIf creates the host in the next Angular render cycle.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (this.destroyed || !this.mapHost) return;
      this.map = new maplibregl.Map({
        container: this.mapHost.nativeElement, style: MAP_STYLE,
        center: guide.map.center, zoom: guide.map.zoom, renderWorldCopies: false,
      });
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      this.renderPlaces();
      this.observer = new ResizeObserver(() => this.map?.resize());
      this.observer.observe(this.mapHost.nativeElement);
    } catch (error) {
      if (this.destroyed) return;
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Hiba történt.';
    }
  }
  renderPlaces(): void {
    this.markers.forEach(m=>m.remove());this.markers=[];
    if(!this.map)return;
    for(const place of this.filteredPlaces){
      const node=document.createElement('button');
      node.type='button';node.textContent=place.kind==='event'?'★':'●';
      node.setAttribute('aria-label',place.title);
      node.style.cssText='background:#1c7255;color:white;border:2px solid white;border-radius:50%;width:32px;height:32px;cursor:pointer;box-shadow:0 3px 12px #0005';
      node.addEventListener('click',()=>this.focusPlace(place));
      this.markers.push(new maplibregl.Marker({element:node}).setLngLat(place.coordinates).addTo(this.map));
    }
  }
  focusPlace(place:GuestPlace):void {
    this.map?.flyTo({center:place.coordinates,zoom:Math.max(this.map.getZoom(),13)});
    const popup=new maplibregl.Popup({offset:24}).setLngLat(place.coordinates);
    const element=document.createElement('div');
    const heading=document.createElement('strong');heading.textContent=place.title;element.appendChild(heading);
    if(place.description){const text=document.createElement('p');text.textContent=place.description.slice(0,280);element.appendChild(text);}
    if(place.attribution){const attribution=document.createElement('small');attribution.textContent='Forrás: '+place.attribution;element.appendChild(attribution);}
    popup.setDOMContent(element).addTo(this.map!);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.markers.forEach(m=>m.remove());
    this.map?.remove();
  }
}
