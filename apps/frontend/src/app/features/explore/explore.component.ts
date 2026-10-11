import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import {
  BehaviorSubject, Subject, EMPTY, catchError, combineLatest, debounceTime, distinctUntilChanged, filter, map, of,
  switchMap, takeUntil, tap,
} from 'rxjs';
import { MapService, ViewportBounds } from '../../core/services/map.service';
import { CountyService, CountySummary, countySlug } from '../../core/services/county.service';
import { Poi, POIService } from '../../core/services/poi.service';
import { CATEGORIES } from '../landing/landing-content';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons/icons';
import { CategoryIconComponent } from '../../shared/icons/category-icon.component';

const HUNGARY_BOUNDS = { minLat: 45.5, maxLat: 48.7, minLng: 16, maxLng: 23 };

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CategoryIconComponent,
    LucideAngularModule,
  ],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
})
export class ExploreComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = ICONS;
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLElement>;

  readonly categoryOptions = CATEGORIES.map((c) => ({ key: c.key, name: c.name }));

  mapZoom = 7;
  visiblePOIs: Poi[] = [];
  selectedCategories: Set<string> = new Set();
  poiState: 'loading' | 'ready' | 'error' = 'loading';
  /** POIs matching the active category filter anywhere in Hungary; null = not checked/unknown. */
  elsewhereCount: number | null = null;
  mapError = '';
  counties: CountySummary[] = [];
  selectedCounty?: CountySummary;
  selectedPoi?: Poi;
  countyError = '';
  countyAttribution = '';
  notices: string[] = [];
  /** Mobile only: which pane is visible. */
  mobileView: 'map' | 'list' = 'map';
  failedImages = new Set<string>();

  private categoryNotice = '';
  private countyNotice = '';
  private searchNotice = '';
  private viewport?: ViewportBounds;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private counties$ = new BehaviorSubject<CountySummary[] | null>(null);
  /** Whole-country existence check per category combination: asked once, not on every pan. */
  private elsewhereCache = new Map<string, number | null>();

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

  hasCategory(key: string): boolean {
    return this.selectedCategories.has(key);
  }

  /** Only http(s) links are rendered, whatever the data contains. */
  safeUrl(url: string | null): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
  }

  osmLink(poi: Poi): string | null {
    const c = poi.location?.coordinates;
    return c ? `https://www.openstreetmap.org/?mlat=${c[1]}&mlon=${c[0]}#map=17/${c[1]}/${c[0]}` : null;
  }

  ngOnInit() {
    this.mapService.viewportChange$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      this.viewport = v;
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

    // The URL is the single source of truth: clicks and chips only navigate, this applies the result.
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

    this.mapService.poiClick$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const poi = this.visiblePOIs.find((p) => p.id === id);
      if (poi) this.selectPoi(poi, false);
    });

    // Viewport -> POIs. Debounced, and switchMap cancels any request that is already stale.
    this.reload$
      .pipe(
        debounceTime(250),
        tap(() => (this.poiState = 'loading')),
        switchMap(() => {
          const v = this.viewport;
          if (!v) return EMPTY;
          const categories = Array.from(this.selectedCategories);
          return this.poiService.getPOIsByViewport(v.minLat, v.maxLat, v.minLng, v.maxLng, categories).pipe(
            switchMap((pois) => {
              if (pois.length || !categories.length) return of({ pois, elsewhere: null as number | null });
              // Empty with a filter on: is that only because of the viewport? Asked once per filter set.
              const key = [...categories].sort().join(',');
              if (this.elsewhereCache.has(key)) return of({ pois, elsewhere: this.elsewhereCache.get(key)! });
              const b = HUNGARY_BOUNDS;
              return this.poiService.getPOIsByViewport(b.minLat, b.maxLat, b.minLng, b.maxLng, categories).pipe(
                map((all) => all.length as number | null),
                catchError(() => of(null as number | null)),
                tap((n) => this.elsewhereCache.set(key, n)),
                map((elsewhere) => ({ pois, elsewhere })),
              );
            }),
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
        if (this.selectedPoi) this.selectedPoi = pois.find((p) => p.id === this.selectedPoi!.id) ?? this.selectedPoi;
      });
  }

  ngAfterViewInit() {
    this.mapService.initializeMap(this.mapElement.nativeElement, [19.5033, 47.1625], this.mapZoom);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.mapService.destroy();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedPoi) this.closePoi();
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
    this.notices = [this.categoryNotice, this.countyNotice, this.searchNotice].filter(Boolean);
  }

  /** Changes only the given params (null removes one) and keeps every other query parameter. */
  private updateQuery(params: Record<string, string | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
  }

  // ---- user actions ----------------------------------------------------------------------

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
    this.closePoi();
    this.searchNotice = '';
    this.updateQuery({ county: null, category: null });
    this.mapService.resetView();
  }

  /** Back to the country-wide view without touching the filters. */
  showWholeCountry() {
    this.mapService.resetView();
  }

  /** County search box: jumps to the matching county via the URL. */
  searchCounty(value: string, input: HTMLInputElement) {
    const q = plain(value);
    this.searchNotice = '';
    if (!q) {
      this.updateNotices();
      return;
    }
    const hit =
      this.counties.find((c) => plain(c.name) === q || countySlug(c) === q) ??
      this.counties.find((c) => plain(c.name).startsWith(q));
    if (hit && hit.active) {
      this.updateQuery({ county: countySlug(hit) });
      input.value = '';
    } else {
      this.searchNotice = `Nincs ilyen vármegye: „${value.trim()}”.`;
    }
    this.updateNotices();
  }

  selectPoi(poi: Poi, fly: boolean) {
    this.selectedPoi = poi;
    this.mapService.selectPOI(poi.id);
    const c = poi.location?.coordinates;
    if (fly && c) this.mapService.flyTo(c[0], c[1], Math.max(this.mapZoom, 12));
    if (fly) this.mobileView = 'map';
    // keep the matching result card visible in the list
    setTimeout(() => document.getElementById('poi-' + poi.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  closePoi() {
    this.selectedPoi = undefined;
    this.mapService.selectPOI(null);
  }

  retry() {
    this.reload$.next();
  }

  hoverPoi(id: string | null) {
    this.mapService.highlightPOI(id);
  }

  setMobileView(view: 'map' | 'list') {
    this.mobileView = view;
  }
}
