import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import {
  BehaviorSubject, Subject, EMPTY, catchError, combineLatest, debounceTime, distinctUntilChanged, filter, map, of,
  switchMap, takeUntil, tap,
} from 'rxjs';
import { MapService, ViewportBounds } from '../../core/services/map.service';
import { CountyService, CountySummary, countySlug } from '../../core/services/county.service';
import { POIService } from '../../core/services/poi.service';
import { CATEGORIES } from '../landing/landing-content';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';

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

      <section class="active-bar" *ngIf="hasActiveFilters || notices.length" aria-label="Aktív szűrők">
        <ul class="chips" *ngIf="hasActiveFilters">
          <li *ngIf="selectedCounty">
            <span class="chip">Vármegye: <strong>{{ selectedCounty.name }}</strong>
              <button type="button" (click)="removeCounty()" [attr.aria-label]="selectedCounty.name + ' szűrő törlése'">×</button>
            </span>
          </li>
          <li *ngFor="let c of selectedCategoryList">
            <span class="chip">Kategória: <strong>{{ categoryLabel(c) }}</strong>
              <button type="button" (click)="toggleCategory(c, false)" [attr.aria-label]="categoryLabel(c) + ' szűrő törlése'">×</button>
            </span>
          </li>
        </ul>
        <button type="button" class="reset" (click)="resetFilters()">Szűrők törlése</button>
        <p class="notice" *ngFor="let n of notices" role="status">{{ n }}</p>
      </section>

      <main class="main-content">
        <aside class="sidebar">
          <div class="filters">
            <h2>Szűrők</h2>
            <div class="filter-group">
              <label *ngFor="let c of categoryOptions">
                <input type="checkbox" [checked]="selectedCategories.has(c.key)" (change)="onCheckbox($event, c.key)" />
                {{ c.name }}
              </label>
            </div>
          </div>

          <div class="pois-list" aria-live="polite">
            <h3>Érdekes helyek</h3>
            <div class="poi-item" *ngFor="let poi of visiblePOIs" (click)="focusPOI(poi)">
              <h4>{{ poi.name }}</h4>
              <p class="category">{{ categoryLabel(poi.category) }}</p>
              <p class="description">{{ poi.description }}</p>
            </div>
            <div class="empty-state" *ngIf="poiState === 'loading'">
              <p>Helyek betöltése…</p>
            </div>
            <div class="empty-state error" *ngIf="poiState === 'error'" role="alert">
              <p>A helyek nem tölthetők be. Fut a háttérszolgáltatás?</p>
            </div>
            <div class="empty-state" *ngIf="poiState === 'ready' && visiblePOIs.length === 0">
              <p *ngIf="!selectedCategories.size">Ebben a nézetben nincs találat. Mozgasd vagy nagyítsd a térképet.</p>
              <p *ngIf="selectedCategories.size && elsewhereCount === 0">
                Ehhez a szűrőhöz még nincs adat az adatbázisban.
              </p>
              <ng-container *ngIf="selectedCategories.size && elsewhereCount">
                <p>Ebben a nézetben nincs találat, de az ország más részén {{ elsewhereCount }} hely van.</p>
                <button type="button" class="link" (click)="showWholeCountry()">Teljes ország mutatása</button>
              </ng-container>
              <p *ngIf="selectedCategories.size && elsewhereCount === null">Ebben a nézetben nincs találat.</p>
            </div>
          </div>
        </aside>

        <div class="map-container">
          <div #mapElement class="map"></div>
          <div class="map-notice" *ngIf="mapError" role="alert">A térkép nem érhető el: {{ mapError }}</div>
          <div class="map-info">
            <p>
              {{ mapCenter.lat.toFixed(4) }}, {{ mapCenter.lng.toFixed(4) }} | Nagyítás: {{ mapZoom }}
              <ng-container *ngIf="selectedCounty">
                | Vármegye: <strong>{{ selectedCounty.name }}</strong>
                <button type="button" class="link" (click)="removeCounty()">törlés</button>
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
      .active-bar { padding: 0.5rem 1rem; }
      .sidebar { width: 100%; max-height: 38%; border-right: 0; border-bottom: 1px solid #e0e0e0; }
      .map-container { min-height: 0; }
    }

    .active-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
      padding: 0.6rem 1.5rem;
      background: #1c2a22;
      color: #f2efe6;
      font-size: 0.9rem;
    }

    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; margin: 0; }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.3rem 0.2rem 0.7rem;
      border: 1px solid #c6f05a;
      border-radius: 999px;
      color: #c6f05a;
    }

    .chip strong { color: #f2efe6; font-weight: 600; }

    .chip button {
      border: 0;
      background: none;
      color: inherit;
      font-size: 1.1rem;
      line-height: 1;
      width: 1.5rem;
      height: 1.5rem;
      cursor: pointer;
      border-radius: 50%;
    }

    .chip button:hover { background: rgba(198, 240, 90, 0.2); }

    .active-bar .reset {
      border: 0;
      background: none;
      color: #f2efe6;
      text-decoration: underline;
      cursor: pointer;
      font: inherit;
    }

    .active-bar .notice { margin: 0; color: #ffd77a; }

    .active-bar button:focus-visible { outline: 2px solid #c6f05a; outline-offset: 2px; }

    .empty-state .link {
      border: 0;
      background: none;
      color: #667eea;
      text-decoration: underline;
      cursor: pointer;
      font: inherit;
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

  readonly categoryOptions = CATEGORIES.map((c) => ({ key: c.key, name: c.name }));

  mapCenter = { lat: 47.1625, lng: 19.5033 }; // Center of Hungary
  mapZoom = 7;
  visiblePOIs: any[] = [];
  selectedCategories: Set<string> = new Set();
  poiState: 'loading' | 'ready' | 'error' = 'loading';
  /** POIs matching the active category filter anywhere in Hungary; null = not checked/unknown. */
  elsewhereCount: number | null = null;
  mapError = '';
  counties: CountySummary[] = [];
  selectedCounty?: CountySummary;
  countyError = '';
  countyAttribution = '';
  notices: string[] = [];

  private categoryNotice = '';
  private countyNotice = '';
  private viewport?: ViewportBounds;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private counties$ = new BehaviorSubject<CountySummary[] | null>(null);

  constructor(
    private mapService: MapService,
    private poiService: POIService,
    private countyService: CountyService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get selectedCategoryList(): string[] {
    return this.categoryOptions.map((c) => c.key).filter((k) => this.selectedCategories.has(k));
  }

  get hasActiveFilters(): boolean {
    return !!this.selectedCounty || this.selectedCategories.size > 0;
  }

  categoryLabel(key: string): string {
    return this.categoryOptions.find((c) => c.key === key)?.name ?? key;
  }

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
        this.counties$.next(counties);
      },
      error: (err) => {
        console.error('County request failed', err);
        this.countyError = 'A vármegyehatárok nem tölthetők be.';
        this.counties$.next([]);
      },
    });

    // The URL is the single source of truth: clicks and checkboxes only navigate, this applies the result.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((p) => this.applyCategoryParam(p));

    combineLatest([
      this.route.queryParamMap.pipe(map((p) => p.get('county')), distinctUntilChanged()),
      this.counties$.pipe(filter((c): c is CountySummary[] => c !== null)),
    ])
      .pipe(
        switchMap(([slug, counties]) => this.applyCountyParam(slug, counties)),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.mapService.countyClick$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const county = this.counties.find((c) => c.id === id);
      if (county) this.updateQuery({ county: countySlug(county) });
    });

    this.reload$
      .pipe(
        debounceTime(250),
        tap(() => (this.poiState = 'loading')),
        switchMap(() => {
          const v = this.viewport;
          if (!v) return EMPTY;
          const categories = Array.from(this.selectedCategories);
          return this.poiService.getPOIsByViewport(v.minLat, v.maxLat, v.minLng, v.maxLng, categories).pipe(
            switchMap((pois) =>
              pois.length || !categories.length
                ? of({ pois, elsewhere: null as number | null })
                : // Empty with a filter on: find out whether that is only because of the viewport.
                  this.poiService.getPOIsByViewport(45.5, 48.7, 16, 23, categories).pipe(
                    map((all) => ({ pois, elsewhere: all.length as number | null })),
                    catchError(() => of({ pois, elsewhere: null as number | null })),
                  ),
            ),
            catchError((err) => {
              console.error('POI request failed', err);
              this.poiState = 'error';
              return EMPTY;
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ pois, elsewhere }) => {
        this.visiblePOIs = pois;
        this.elsewhereCount = elsewhere;
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

  // ---- URL state -------------------------------------------------------------------------

  private applyCategoryParam(params: ParamMap) {
    const requested = (params.get('category') ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    const known = new Set(this.categoryOptions.map((c) => c.key));
    const valid = requested.filter((v) => known.has(v));
    const unknown = requested.filter((v) => !known.has(v));
    this.selectedCategories = new Set(valid);
    this.categoryNotice = unknown.length ? `Ismeretlen kategória: ${unknown.join(', ')}.` : '';
    this.updateNotices();
    this.reload$.next();
  }

  private applyCountyParam(slug: string | null, counties: CountySummary[]) {
    this.countyNotice = '';
    const unselect = () => {
      this.selectedCounty = undefined;
      this.mapService.clearCountyDetail();
    };
    if (!slug) {
      unselect();
      this.updateNotices();
      return EMPTY;
    }
    const county = counties.find((c) => countySlug(c) === slug);
    if (!county || !county.active) {
      unselect();
      this.countyNotice = this.countyError
        ? `A(z) „${slug}” vármegye nem jeleníthető meg, mert a vármegyehatárok nem töltődtek be.`
        : county
          ? `A(z) ${county.name} vármegye még nem érhető el.`
          : `Ismeretlen vármegye: „${slug}”.`;
      this.updateNotices();
      return EMPTY;
    }
    this.updateNotices();
    // Accurate full-resolution geometry for the detailed view, not the simplified overview one.
    return this.countyService.getCountyGeometry(county.id).pipe(
      tap((g) => {
        this.selectedCounty = county;
        this.mapService.showCountyDetail(county.id, g.geometry);
      }),
      catchError((err) => {
        console.error('County geometry request failed', err);
        this.countyError = 'A vármegye részletei nem tölthetők be.';
        return EMPTY;
      }),
    );
  }

  private updateNotices() {
    this.notices = [this.categoryNotice, this.countyNotice].filter(Boolean);
  }

  /** Changes only the given params (null removes one) and keeps every other query parameter. */
  private updateQuery(params: Record<string, string | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
  }

  // ---- user actions ----------------------------------------------------------------------

  onCheckbox(event: Event, category: string) {
    this.toggleCategory(category, (event.target as HTMLInputElement).checked);
  }

  toggleCategory(category: string, on: boolean) {
    const next = new Set(this.selectedCategories);
    if (on) next.add(category);
    else next.delete(category);
    const list = this.categoryOptions.map((c) => c.key).filter((k) => next.has(k));
    this.updateQuery({ category: list.length ? list.join(',') : null });
  }

  removeCounty() {
    this.updateQuery({ county: null });
  }

  resetFilters() {
    this.updateQuery({ county: null, category: null });
    this.mapService.resetView();
  }

  showWholeCountry() {
    this.mapService.resetView();
  }

  focusPOI(poi: any) {
    const c = poi.location?.coordinates;
    if (c) this.mapService.flyTo(c[0], c[1]);
  }
}
