import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subject, EMPTY, catchError, debounceTime, switchMap, takeUntil, tap } from 'rxjs';
import { MapService, ViewportBounds } from '../../core/services/map.service';
import { CountyService, CountySummary } from '../../core/services/county.service';
import { POIService } from '../../core/services/poi.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <header class="header">
        <a routerLink="/" class="back-link">← Főoldal</a>
        <h1>Magyarország Felfedezője</h1>
        <p class="subtitle">Premium Tourism Discovery Platform</p>
      </header>

      <main class="main-content">
        <aside class="sidebar">
          <div class="filters">
            <h2>Filters</h2>
            <div class="filter-group">
              <label>
                <input type="checkbox" (change)="toggleCategory($event, 'attraction')" />
                Attractions
              </label>
              <label>
                <input type="checkbox" (change)="toggleCategory($event, 'restaurant')" />
                Restaurants
              </label>
              <label>
                <input type="checkbox" (change)="toggleCategory($event, 'accommodation')" />
                Accommodation
              </label>
              <label>
                <input type="checkbox" (change)="toggleCategory($event, 'event')" />
                Events
              </label>
            </div>
          </div>

          <div class="pois-list">
            <h3>Points of Interest</h3>
            <div class="poi-item" *ngFor="let poi of visiblePOIs" (click)="focusPOI(poi)">
              <h4>{{ poi.name }}</h4>
              <p class="category">{{ poi.category }}</p>
              <p class="description">{{ poi.description }}</p>
            </div>
            <div class="empty-state" *ngIf="poiState === 'loading'">
              <p>Loading points of interest…</p>
            </div>
            <div class="empty-state error" *ngIf="poiState === 'error'" role="alert">
              <p>Could not load points of interest. Is the backend running?</p>
            </div>
            <div class="empty-state" *ngIf="poiState === 'ready' && visiblePOIs.length === 0">
              <p>No points of interest in this area yet. Pan, zoom or change the filters.</p>
            </div>
          </div>
        </aside>

        <div class="map-container">
          <div #mapElement class="map"></div>
          <div class="map-notice" *ngIf="mapError" role="alert">Map unavailable: {{ mapError }}</div>
          <div class="map-info">
            <p>
              {{ mapCenter.lat.toFixed(4) }}, {{ mapCenter.lng.toFixed(4) }} | Zoom: {{ mapZoom }}
              <ng-container *ngIf="selectedCounty">
                | County: <strong>{{ selectedCounty.name }}</strong>
                <button type="button" class="link" (click)="clearCounty()">clear</button>
              </ng-container>
              <span *ngIf="countyError" class="error"> | {{ countyError }}</span>
            </p>
            <p class="credit" *ngIf="countyAttribution">{{ countyAttribution }}</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-link {
      display: inline-block;
      margin-bottom: 0.5rem;
      color: white;
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .back-link:focus-visible {
      outline: 2px solid white;
      outline-offset: 3px;
    }

    .header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .subtitle {
      margin: 0.5rem 0 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    .main-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 320px;
      background: #f8f9fa;
      border-right: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .filters, .pois-list {
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .filters h2 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .filter-group label {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
      cursor: pointer;
      font-size: 0.95rem;
    }

    .filter-group input {
      margin-right: 0.75rem;
      cursor: pointer;
    }

    .pois-list {
      flex: 1;
      overflow-y: auto;
    }

    .pois-list h3 {
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .poi-item {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      cursor: pointer;
      transition: all 0.2s;
    }

    .poi-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .poi-item h4 {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .poi-item .category {
      margin: 0;
      font-size: 0.8rem;
      color: #667eea;
      font-weight: 500;
    }

    .poi-item .description {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: #666;
      line-height: 1.3;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #999;
      font-size: 0.9rem;
    }

    .map-container {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .map {
      flex: 1;
      min-height: 0;
      background: #e0e0e0;
    }

    .map-notice {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      right: 4rem;
      padding: 0.5rem 0.75rem;
      background: #fff3cd;
      border: 1px solid #e0c36a;
      border-radius: 6px;
      font-size: 0.85rem;
      z-index: 1;
    }

    @media (max-width: 768px) {
      .header { padding: 1rem; }
      .header h1 { font-size: 1.4rem; }
      .main-content { flex-direction: column; }
      .sidebar { width: 100%; max-height: 38%; border-right: 0; border-bottom: 1px solid #e0e0e0; }
      .map-container { min-height: 0; }
    }

    .map-info .credit {
      margin-top: 0.25rem;
      font-size: 0.7rem;
      color: #888;
    }

    .map-info .error {
      color: #b00020;
    }

    .map-info .link {
      margin-left: 0.5rem;
      border: 0;
      background: none;
      color: #667eea;
      cursor: pointer;
      text-decoration: underline;
      font: inherit;
    }

    .empty-state.error {
      color: #b00020;
    }

    .map-info {
      padding: 0.75rem 1rem;
      background: white;
      border-top: 1px solid #e0e0e0;
      font-size: 0.85rem;
      color: #666;
    }
  `]
})
export class ExploreComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLElement>;

  mapCenter = { lat: 47.1625, lng: 19.5033 }; // Center of Hungary
  mapZoom = 7;
  visiblePOIs: any[] = [];
  selectedCategories: Set<string> = new Set();
  poiState: 'loading' | 'ready' | 'error' = 'loading';
  mapError = '';
  counties: CountySummary[] = [];
  selectedCounty?: CountySummary;
  countyError = '';
  countyAttribution = '';

  private viewport?: ViewportBounds;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private mapService: MapService,
    private poiService: POIService,
    private countyService: CountyService,
  ) {}

  ngOnInit() {
    this.mapService.viewportChange$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      this.viewport = v;
      this.mapCenter = { lat: (v.minLat + v.maxLat) / 2, lng: (v.minLng + v.maxLng) / 2 };
      this.mapZoom = Math.round(v.zoom * 10) / 10;
      this.reload$.next();
    });
    this.mapService.status$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      this.mapError = s === 'ready' ? '' : s;
    });

    this.countyService.getAllCounties().pipe(takeUntil(this.destroy$)).subscribe({
      next: (counties) => {
        this.counties = counties;
        // Credit required by the boundary licence (CC BY 4.0); same text for every row of one source.
        this.countyAttribution = counties.find((c) => c.attribution)?.attribution ?? '';
        this.mapService.setCounties(counties);
      },
      error: (err) => {
        console.error('County request failed', err);
        this.countyError = 'Could not load county boundaries.';
      },
    });

    this.mapService.countyClick$
      .pipe(
        switchMap((id) =>
          this.countyService.getCountyGeometry(id).pipe(
            // Accurate full-resolution geometry for the detailed view, not the simplified overview one.
            tap((g) => {
              this.selectedCounty = this.counties.find((c) => c.id === id);
              this.mapService.showCountyDetail(id, g.geometry);
            }),
            catchError((err) => {
              console.error('County geometry request failed', err);
              this.countyError = 'Could not load county detail.';
              return EMPTY;
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.reload$
      .pipe(
        debounceTime(250),
        tap(() => (this.poiState = 'loading')),
        switchMap(() => {
          const v = this.viewport;
          if (!v) return EMPTY;
          return this.poiService
            .getPOIsByViewport(v.minLat, v.maxLat, v.minLng, v.maxLng, Array.from(this.selectedCategories))
            .pipe(
              catchError((err) => {
                console.error('POI request failed', err);
                this.poiState = 'error';
                return EMPTY;
              }),
            );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((pois) => {
        this.visiblePOIs = pois;
        this.poiState = 'ready';
        this.mapService.setPOIs(pois);
      });
  }

  ngAfterViewInit() {
    this.mapService.initializeMap(this.mapElement.nativeElement, [this.mapCenter.lng, this.mapCenter.lat], this.mapZoom);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.mapService.destroy();
  }

  toggleCategory(event: any, category: string) {
    if (event.target.checked) {
      this.selectedCategories.add(category);
    } else {
      this.selectedCategories.delete(category);
    }
    this.reload$.next();
  }

  clearCounty() {
    this.selectedCounty = undefined;
    this.mapService.clearCountyDetail();
  }

  focusPOI(poi: any) {
    const c = poi.location?.coordinates;
    if (c) this.mapService.flyTo(c[0], c[1]);
  }
}
