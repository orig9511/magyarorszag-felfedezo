import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import {
  BehaviorSubject, Subject, EMPTY, catchError, combineLatest, debounceTime, distinctUntilChanged, filter, map, of,
  switchMap, takeUntil, tap,
} from 'rxjs';
import { MapService, ViewportBounds } from '../../core/services/map.service';
import { CountyService, CountySummary, countySlug } from '../../core/services/county.service';
import { Poi, POIService } from '../../core/services/poi.service';
import { Event as AppEvent, EventService } from '../../core/services/event.service';
import { CATEGORIES } from '../landing/landing-content';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons/icons';
import { CategoryIconComponent } from '../../shared/icons/category-icon.component';

const HUNGARY_BOUNDS = { minLat: 45.5, maxLat: 48.7, minLng: 16, maxLng: 23 };
const MAX_VISIBLE_CARDS = 20;
const EVENT_PANEL_ZOOM_THRESHOLD = 10;

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type EventDatePreset = 'any' | 'today' | 'tomorrow' | 'nextDays' | 'fixed';

type ExploreCard = {
  kind: 'poi' | 'event';
  id: string;
  title: string;
  category: string;
  description?: string;
  sponsored?: boolean;
  source?: string;
  website?: string;
  sourceUrl?: string;
  address?: string;
  phone?: string;
  location?: { type: string; coordinates: [number, number] };
  startTime?: Date;
  endTime?: Date;
  venue?: string;
  settlement?: string;
};

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
  visibleCards: ExploreCard[] = [];
  selectedCategories: Set<string> = new Set();
  poiState: 'loading' | 'ready' | 'error' = 'loading';
  elsewhereCount: number | null = null;
  mapError = '';
  counties: CountySummary[] = [];
  selectedCounty?: CountySummary;
  selectedCard?: ExploreCard;
  countyError = '';
  countyAttribution = '';
  notices: string[] = [];
  mobileView: 'map' | 'list' = 'map';
  failedImages = new Set<string>();

  eventDatePreset: EventDatePreset = 'nextDays';
  eventDaysWindow = 7;
  eventFixedDate = '';
  countyFilterEngaged = false;
  private randomSeed = Date.now();

  private categoryNotice = '';
  private countyNotice = '';
  private searchNotice = '';
  private viewport?: ViewportBounds;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private counties$ = new BehaviorSubject<CountySummary[] | null>(null);
  private elsewhereCache = new Map<string, number | null>();

  constructor(
    private mapService: MapService,
    private poiService: POIService,
    private eventService: EventService,
    private countyService: CountyService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get hasActiveFilters(): boolean {
    return !!this.selectedCounty || this.selectedCategories.size > 0 || this.eventDatePreset !== 'nextDays' || this.eventDaysWindow !== 7;
  }

  get showEventDateFilters(): boolean {
    return this.selectedCategories.has('event') || this.mapZoom >= EVENT_PANEL_ZOOM_THRESHOLD;
  }

  get shouldRandomizeCards(): boolean {
    return this.countyFilterEngaged;
  }

  categoryLabel(key: string): string {
    return this.categoryOptions.find((c) => c.key === key)?.name ?? key;
  }

  hasCategory(key: string): boolean {
    return this.selectedCategories.has(key);
  }

  safeUrl(url: string | null | undefined): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
  }

  osmLink(card: ExploreCard): string | null {
    const c = card.location?.coordinates;
    return c ? `https://www.openstreetmap.org/?mlat=${c[1]}&mlon=${c[0]}#map=17/${c[1]}/${c[0]}` : null;
  }

  formatEventDate(date?: Date): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
      if (!poi) return;
      this.selectCard(this.poiToCard(poi), false);
    });

    this.reload$
      .pipe(
        debounceTime(250),
        tap(() => (this.poiState = 'loading')),
        switchMap(() => {
          const v = this.viewport;
          if (!v) return EMPTY;
          const categories = Array.from(this.selectedCategories);
          const poiCategories = categories.filter((c) => c !== 'event');
          const fetchEvents = categories.length === 0 || categories.includes('event');

          const poiRequest = this.poiService.getPOIsByViewport(
            v.minLat,
            v.maxLat,
            v.minLng,
            v.maxLng,
            poiCategories.length > 0 ? poiCategories : undefined,
          );
          const eventRequest = fetchEvents
            ? this.eventService.getEventsByViewport(v.minLat, v.minLng, v.maxLat, v.maxLng, {
                countyId: this.selectedCounty?.id,
                days: this.getEventDaysApiParam(),
              }).pipe(catchError(() => of([] as AppEvent[])))
            : of([] as AppEvent[]);

          return combineLatest([poiRequest, eventRequest]).pipe(
            switchMap(([pois, events]) => {
              const filteredEvents = this.filterEventsByDate(events);
              const cards = this.limitCards([
                ...pois.map((poi) => this.poiToCard(poi)),
                ...filteredEvents.map((event) => this.eventToCard(event)),
              ]);

              if (pois.length || !poiCategories.length) {
                return of({ pois, cards, elsewhere: null as number | null });
              }

              const key = [...poiCategories].sort().join(',');
              if (this.elsewhereCache.has(key)) {
                return of({ pois, cards, elsewhere: this.elsewhereCache.get(key)! });
              }
              const b = HUNGARY_BOUNDS;
              return this.poiService.getPOIsByViewport(b.minLat, b.maxLat, b.minLng, b.maxLng, poiCategories).pipe(
                map((all) => all.length as number | null),
                catchError(() => of(null as number | null)),
                tap((n) => this.elsewhereCache.set(key, n)),
                map((elsewhere) => ({ pois, cards, elsewhere })),
              );
            }),
            catchError((err) => {
              console.error('POI/Event request failed', err);
              this.poiState = 'error';
              return EMPTY;
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ pois, cards, elsewhere }) => {
        this.visiblePOIs = pois;
        this.visibleCards = cards;
        this.elsewhereCount = elsewhere;
        this.poiState = 'ready';
        this.mapService.setPOIs(pois);
        if (this.selectedCard) {
          this.selectedCard = cards.find((c) => c.kind === this.selectedCard!.kind && c.id === this.selectedCard!.id) ?? this.selectedCard;
        }
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
    if (this.selectedCard) this.closeDetail();
  }

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
    return this.countyService.getCountyGeometry(county.id).pipe(
      tap((g) => {
        this.selectedCounty = county;
        this.mapService.showCountyDetail(county.id, g.geometry);
        this.reload$.next();
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

  private updateQuery(params: Record<string, string | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
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
    this.closeDetail();
    this.searchNotice = '';
    this.countyFilterEngaged = false;
    this.eventDatePreset = 'nextDays';
    this.eventDaysWindow = 7;
    this.eventFixedDate = '';
    this.updateQuery({ county: null, category: null });
    this.mapService.resetView();
    this.reload$.next();
  }

  showWholeCountry() {
    this.mapService.resetView();
  }

  searchCounty(value: string, input: HTMLInputElement) {
    this.activateCountyRandom();
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

  activateCountyRandom() {
    this.countyFilterEngaged = true;
    this.randomSeed = Date.now();
    this.reload$.next();
  }

  selectCard(card: ExploreCard, fly: boolean) {
    this.selectedCard = card;
    if (card.kind === 'poi') {
      this.mapService.selectPOI(card.id);
    }
    const c = card.location?.coordinates;
    if (fly && c) this.mapService.flyTo(c[0], c[1], Math.max(this.mapZoom, 12));
    if (fly) this.mobileView = 'map';
    setTimeout(() => document.getElementById('card-' + card.kind + '-' + card.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  closeDetail() {
    this.selectedCard = undefined;
    this.mapService.selectPOI(null);
  }

  retry() {
    this.reload$.next();
  }

  hoverCard(card: ExploreCard | null) {
    if (!card || card.kind !== 'poi') {
      this.mapService.highlightPOI(null);
      return;
    }
    this.mapService.highlightPOI(card.id);
  }

  setMobileView(view: 'map' | 'list') {
    this.mobileView = view;
  }

  setEventDatePreset(preset: EventDatePreset) {
    this.eventDatePreset = preset;
    if (preset !== 'fixed') {
      this.eventFixedDate = '';
    }
    this.reload$.next();
  }

  onEventDaysWindowChange(days: number) {
    this.eventDaysWindow = Math.max(1, Math.min(30, days));
    this.eventDatePreset = 'nextDays';
    this.reload$.next();
  }

  onFixedDateChange(value: string) {
    this.eventFixedDate = value;
    this.eventDatePreset = value ? 'fixed' : 'any';
    this.reload$.next();
  }

  private getEventDaysApiParam(): number | undefined {
    if (this.eventDatePreset === 'today') return 1;
    if (this.eventDatePreset === 'tomorrow') return 2;
    if (this.eventDatePreset === 'nextDays') return this.eventDaysWindow;
    if (this.eventDatePreset === 'fixed') return 60;
    return 30;
  }

  private filterEventsByDate(events: AppEvent[]): AppEvent[] {
    const today = this.toDateOnly(new Date());
    return events.filter((event) => {
      const start = new Date(event.startTime);
      if (Number.isNaN(start.getTime())) return false;
      const startDate = this.toDateOnly(start);
      if (this.eventDatePreset === 'today') {
        return startDate === today;
      }
      if (this.eventDatePreset === 'tomorrow') {
        const tomorrow = this.addDays(today, 1);
        return startDate === tomorrow;
      }
      if (this.eventDatePreset === 'nextDays') {
        const from = today;
        const to = this.addDays(today, this.eventDaysWindow);
        return startDate >= from && startDate <= to;
      }
      if (this.eventDatePreset === 'fixed' && this.eventFixedDate) {
        return startDate === this.eventFixedDate;
      }
      return true;
    });
  }

  private limitCards(cards: ExploreCard[]): ExploreCard[] {
    if (!this.shouldRandomizeCards) {
      return cards.slice(0, MAX_VISIBLE_CARDS);
    }
    return [...cards]
      .sort((a, b) => this.seededRank(a) - this.seededRank(b))
      .slice(0, MAX_VISIBLE_CARDS);
  }

  private seededRank(card: ExploreCard): number {
    const s = `${this.randomSeed}:${card.kind}:${card.id}`;
    let hash = 2166136261;
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private poiToCard(poi: Poi): ExploreCard {
    return {
      kind: 'poi',
      id: poi.id,
      title: poi.name,
      category: poi.category,
      description: poi.description,
      sponsored: poi.sponsored,
      source: poi.source,
      website: poi.website,
      address: poi.address,
      phone: poi.phone,
      location: poi.location,
    };
  }

  private eventToCard(event: AppEvent): ExploreCard {
    const startTime = event.startTime ? new Date(event.startTime) : undefined;
    const endTime = event.endTime ? new Date(event.endTime) : undefined;
    return {
      kind: 'event',
      id: event.id,
      title: event.title,
      category: 'event',
      description: event.description,
      sponsored: event.sponsored,
      source: 'events',
      sourceUrl: event.sourceUrl,
      website: event.sourceUrl,
      location: event.location,
      startTime,
      endTime,
      venue: event.venue,
      settlement: event.settlement,
    };
  }

  private toDateOnly(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private addDays(dateOnly: string, days: number): string {
    const [y, m, d] = dateOnly.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return this.toDateOnly(dt);
  }
}
