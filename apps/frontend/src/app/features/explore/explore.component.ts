import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { BehaviorSubject, Subject, EMPTY, catchError, combineLatest, distinctUntilChanged, filter, map, of, switchMap, takeUntil, tap, timer, merge } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MapService, ViewportBounds } from '../../core/services/map.service';
import { CountyService, CountySummary, countySlug } from '../../core/services/county.service';
import { Poi, POIService } from '../../core/services/poi.service';
import { Event as AppEvent, EventService } from '../../core/services/event.service';
import { MapMode, MapPlace, placeKey, viewportKey, visiblePlaces } from '../../core/services/discovery.model';
import { CATEGORIES } from '../landing/landing-content';
import { ICONS } from '../../shared/icons/icons';
import { CategoryIconComponent } from '../../shared/icons/category-icon.component';
import { CATEGORY_VISUALS, categoryVisual } from '../../core/config/category-visuals';

type DatePreset = 'any' | 'today' | 'tomorrow' | 'nextDays' | 'fixed';
interface ExploreCard extends MapPlace {
  description?: string; sponsored?: boolean; source?: string; website?: string; address?: string; phone?: string;
  startTime?: Date; endTime?: Date; venue?: string; settlement?: string; countyId?: string; imageUrl?: string;
}
interface CachedCards { at: number; cards: ExploreCard[] }
const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-explore', standalone: true,
  imports: [CommonModule, RouterLink, CategoryIconComponent, LucideAngularModule],
  templateUrl: './explore.component.html', styleUrls: ['./explore.component.scss'],
})
export class ExploreComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = ICONS;
  readonly visualFor = categoryVisual;
  readonly categoryLegend = Object.values(CATEGORY_VISUALS);
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLElement>;
  @ViewChild('selectionDetails') selectionDetails?: ElementRef<HTMLElement>;
  readonly categoryOptions = CATEGORIES.filter(c => c.key !== 'event').map(c => ({ key: c.key, name: c.name }));
  mode: MapMode = 'overview';
  mapZoom = 7;
  visibleCards: ExploreCard[] = [];
  selectedCategories = new Set<string>();
  poiState: 'loading' | 'ready' | 'error' = 'ready';
  mapError = ''; countyError = ''; eventError = ''; poiError = ''; notice = '';
  counties: CountySummary[] = [];
  selectedCounty?: CountySummary;
  selectedCard?: ExploreCard;
  introVisible = false;
  contentMode: 'all' | 'pois' | 'events' = 'all';
  mobileView: 'map' | 'list' = 'map';
  eventDatePreset: DatePreset = 'nextDays';
  eventDaysWindow = 7;
  eventFixedDate = '';
  resultLimit = 20;
  private viewport?: ViewportBounds;
  private moving = false;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private counties$ = new BehaviorSubject<CountySummary[] | null>(null);
  poiLoading = false;
  eventLoading = false;
  private poiCards: ExploreCard[] = [];
  private eventCards: ExploreCard[] = [];
  private eventReload$ = new Subject<void>();
  private poiCache = new Map<string, CachedCards>();
  private eventCache = new Map<string, CachedCards>();

  constructor(private mapService: MapService, private poiService: POIService, private eventService: EventService,
    private countyService: CountyService, private route: ActivatedRoute, private router: Router) {}

  get hasActiveFilters() { return this.selectedCategories.size > 0 || this.contentMode !== 'all' || this.eventDatePreset !== 'nextDays' || this.eventDaysWindow !== 7; }
  get showEventDateFilters() { return this.contentMode !== 'pois'; }
  get introAttractions() { return this.visibleCards.filter(c => c.kind === 'poi' && c.countyId === this.selectedCounty?.id).slice(0, 3); }
  get introEvents() { return this.visibleCards.filter(c => c.kind === 'event' && c.countyId === this.selectedCounty?.id && c.startTime && c.startTime.getTime() >= Date.now()).slice(0, 3); }
  get countyAttribution() { return this.selectedCounty?.attribution || this.counties.find(c => c.attribution)?.attribution || ''; }
  get introductionPlaceState() {
    if (this.contentMode === 'events') return 'A helyek megjelenítéséhez válaszd a Helyek vagy Minden módot.';
    if (this.poiLoading) return 'Helyek betöltése…';
    if (this.poiError) return this.poiError;
    return this.selectedCategories.size ? 'A szűrt térképnézetben nincs megjeleníthető hely ebből a vármegyéből.' : 'A látható területen nincs megjeleníthető hely ebből a vármegyéből.';
  }
  get introductionEventState() {
    if (this.contentMode === 'pois') return 'Az események megjelenítéséhez válts Minden vagy Események módra.';
    if (this.eventLoading) return 'Események betöltése…';
    if (this.eventError) return this.eventError;
    return 'A választott időszakban és térképnézetben nincs megjeleníthető közelgő esemény ebből a vármegyéből.';
  }
  categoryLabel(key: string) { return key === 'event' ? 'Esemény' : this.categoryOptions.find(c => c.key === key)?.name ?? key; }
  hasCategory(key: string) { return this.selectedCategories.has(key); }
  cardKey(_index: number, card: ExploreCard) { return placeKey(card); }
  safeUrl(url?: string | null) { return url && /^https?:\/\//i.test(url) ? url : null; }
  osmLink(card: ExploreCard) { const c = card.location?.coordinates; return c ? `https://www.openstreetmap.org/?mlat=${c[1]}&mlon=${c[0]}#map=17/${c[1]}/${c[0]}` : null; }
  formatEventDate(date?: Date) { return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(date) : ''; }

  ngOnInit() {
    this.mapService.mode$.pipe(takeUntil(this.destroy$)).subscribe(mode => {
      this.mode = mode;
      if (mode !== 'roam') { this.poiCards = []; this.eventCards = []; this.poiLoading = false; this.eventLoading = false; this.visibleCards = []; this.selectedCard = undefined; this.mapService.setPlaces([]); }
      this.reload$.next();
    });
    this.mapService.status$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.moving = status === 'moving';
      this.mapError = status.startsWith('map error:') ? status : '';
      if (this.moving) this.reload$.next();
    });
    this.mapService.viewportChange$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.viewport = v; this.mapZoom = v.zoom; this.reload$.next();
    });
    this.countyService.getAllCounties().pipe(takeUntil(this.destroy$)).subscribe({
      next: counties => { this.counties = counties; this.mapService.setCounties(counties); this.counties$.next(counties); },
      error: () => { this.countyError = 'A vármegyehatárok nem tölthetők be. Próbáld újra az oldal betöltését.'; this.counties$.next([]); },
    });
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const requested = (params.get('category') || '').split(',').filter(Boolean);
      const known = new Set(this.categoryOptions.map(c => c.key));
      this.selectedCategories = new Set(requested.filter(c => known.has(c)));
      if (requested.includes('event')) this.contentMode = 'events';
      this.reload$.next();
    });
    combineLatest([
      this.route.queryParamMap.pipe(map(p => p.get('county')), distinctUntilChanged()),
      this.counties$.pipe(filter((c): c is CountySummary[] => c !== null)),
    ]).pipe(switchMap(([slug, counties]) => {
      this.notice = '';
      if (!slug) { this.selectedCounty = undefined; this.introVisible = false; this.mapService.clearCountyDetail(); return EMPTY; }
      const county = counties.find(c => countySlug(c) === slug);
      if (!county || !county.active) { this.notice = 'Ez a vármegye jelenleg nem választható.'; return EMPTY; }
      return this.countyService.getCountyGeometry(county.id).pipe(tap(g => {
        if (!g?.geometry) { this.notice = 'A vármegye geometriája nem érhető el.'; return; }
        this.selectedCounty = county; this.introVisible = true; this.mobileView = 'list';
        this.mapService.showCountyDetail(county.id, g.geometry);
      }), catchError(() => { this.notice = 'A vármegye részletei nem tölthetők be.'; return EMPTY; }));
    }), takeUntil(this.destroy$)).subscribe();
    this.mapService.countyClick$.pipe(takeUntil(this.destroy$)).subscribe(id => this.chooseCounty(id));
    this.mapService.placeClick$.pipe(takeUntil(this.destroy$)).subscribe(key => {
      const card = this.visibleCards.find(c => placeKey(c) === key);
      if (card) this.selectCard(card, false);
    });
    this.mapService.placeDetails$.pipe(takeUntil(this.destroy$)).subscribe(key => {
      const card = this.visibleCards.find(c => placeKey(c) === key);
      if (card) {
        this.selectCard(card, false); this.mobileView = 'list';
        requestAnimationFrame(() => this.selectionDetails?.nativeElement.focus({ preventScroll: true }));
      }
    });
    this.mapService.popupClosed$.pipe(takeUntil(this.destroy$)).subscribe(() => { this.selectedCard = undefined; });
    // Separate source streams: event latency and date changes cannot gate or restart POIs.
    this.reload$.pipe(switchMap(() => {
      if (this.mode !== 'roam' || this.moving || !this.viewport) return EMPTY;
      return timer(400).pipe(switchMap(() => {
        const v = { ...this.viewport! }, categories = [...this.selectedCategories].sort();
        this.poiError = ''; this.poiLoading = this.contentMode !== 'events';
        if (this.contentMode === 'events') { this.poiCards = []; return of([] as ExploreCard[]); }
        const key = viewportKey(v, categories);
        const cached = this.poiCache.get(key);
        if (cached && Date.now() - cached.at < 60000) return of(cached.cards);
        this.poiCards = visiblePlaces(this.poiCards, v).filter(card => !categories.length || categories.includes(card.category));
        this.publishResults();
        return this.poiService.getPOIsByViewport(v.minLat, v.maxLat, v.minLng, v.maxLng, categories.length ? categories : undefined).pipe(
          map(pois => visiblePlaces(pois.map(p => this.poiToCard(p)), v)),
          tap(cards => this.cacheCards(this.poiCache, key, cards)),
          catchError(() => { this.poiError = 'A helyek nem tölthetők be. Próbáld újra.'; return of([] as ExploreCard[]); }),
        );
      }));
    }), takeUntil(this.destroy$)).subscribe(cards => {
      this.poiCards = cards; this.poiLoading = false; this.publishResults();
    });
    merge(this.reload$, this.eventReload$).pipe(switchMap(() => {
      // Drop only event results as soon as their date/filter changes; leave POIs untouched.
      this.eventCards = []; this.eventError = ''; this.eventLoading = false; this.publishResults();
      if (this.mode !== 'roam' || this.moving || !this.viewport || this.contentMode === 'pois') return EMPTY;
      this.eventLoading = true;
      return timer(400).pipe(switchMap(() => {
        const v = { ...this.viewport! };
        const dateOptions = this.getEventDateOptions();
        const key = viewportKey(v, [this.eventDatePreset, JSON.stringify(dateOptions)]);
        const cached = this.eventCache.get(key);
        if (cached && Date.now() - cached.at < 60000) return of(cached.cards);
        return this.eventService.getEventsByViewport(v.minLat, v.minLng, v.maxLat, v.maxLng, dateOptions).pipe(
          map(events => visiblePlaces(events.map(e => this.eventToCard(e)), v)),
          tap(cards => this.cacheCards(this.eventCache, key, cards)),
          catchError(() => { this.eventError = 'Az események nem tölthetők be. Próbáld újra.'; return of([] as ExploreCard[]); }),
        );
      }));
    }), takeUntil(this.destroy$)).subscribe(cards => {
      this.eventCards = cards; this.eventLoading = false; this.publishResults();
    });
  }
  private cacheCards(cache: Map<string, CachedCards>, key: string, cards: ExploreCard[]) {
    if (cache.size >= 20) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), cards });
  }
  private publishResults() {
    const cards = this.mode === 'roam' ? [...this.poiCards, ...this.eventCards] : [];
    this.visibleCards = cards.sort((a,b) => a.title.localeCompare(b.title, 'hu') || placeKey(a).localeCompare(placeKey(b)));
    this.poiState = this.poiLoading || this.eventLoading ? 'loading' : this.poiError && this.eventError ? 'error' : 'ready';
    this.mapService.setPlaces(this.visibleCards);
    if (this.selectedCard) {
      const key = placeKey(this.selectedCard);
      this.selectedCard = this.visibleCards.find(c => placeKey(c) === key);
      this.mapService.selectPlace(this.selectedCard ? key : null);
    }
  }

  ngAfterViewInit() { this.mapService.initializeMap(this.mapElement.nativeElement); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); this.mapService.destroy(); }
  @HostListener('document:keydown.escape') onEscape() { this.closeDetail(); }
  private updateQuery(params: Record<string,string|null>) { this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' }); }
  chooseCounty(id: string) { const c = this.counties.find(c => c.id === id && c.active); if (c) this.updateQuery({ county: countySlug(c) }); }
  searchCounty(value: string, input: HTMLInputElement) {
    const q = plain(value); if (!q) return;
    const c = this.counties.find(c => plain(c.name) === q || countySlug(c) === q) ?? this.counties.find(c => plain(c.name).startsWith(q));
    if (c?.active) { this.chooseCounty(c.id); input.value = ''; } else this.notice = 'Nincs ilyen elérhető vármegye.';
  }
  toggleCategory(category: string, on: boolean) {
    const next = new Set(this.selectedCategories); if (on) next.add(category); else next.delete(category);
    this.updateQuery({ category: [...next].sort().join(',') || null });
  }
  setContentMode(mode: 'all' | 'pois' | 'events') { this.contentMode = mode; this.updateQuery({ category: [...this.selectedCategories].join(',') || null }); this.reload$.next(); }
  resetFilters() { this.contentMode = 'all'; this.eventDatePreset = 'nextDays'; this.eventDaysWindow = 7; this.eventFixedDate = ''; this.selectedCategories.clear(); this.updateQuery({ category: null }); this.reload$.next(); }
  removeCounty() { this.updateQuery({ county: null }); }
  dismissIntroduction() { this.introVisible = false; }
  showWholeCountry() { this.selectedCounty = undefined; this.introVisible = false; this.closeDetail(); this.updateQuery({ county: null }); this.mobileView = 'map'; this.mapService.resetView(); }
  showMore() { this.resultLimit += 20; }
  retry() { this.poiCache.clear(); this.eventCache.clear(); this.reload$.next(); }
  selectCard(card: ExploreCard, fly: boolean) {
    this.selectedCard = card; this.mapService.selectPlace(placeKey(card));
    const c = card.location?.coordinates;
    if (fly && c) { this.mapService.flyTo(c[0], c[1], Math.max(this.mapZoom, 12)); this.mobileView = 'map'; }
  }
  closeDetail() { this.selectedCard = undefined; this.mapService.selectPlace(null); }
  hoverCard(card: ExploreCard | null) { this.mapService.highlightPlace(card ? placeKey(card) : null); }
  setMobileView(view: 'map' | 'list') { this.mobileView = view; }
  setEventDatePreset(preset: DatePreset) { this.eventDatePreset = preset; if (preset !== 'fixed') this.eventFixedDate = ''; this.eventReload$.next(); }
  onEventDaysWindowChange(days: number) { this.eventDaysWindow = Math.max(1, Math.min(30, days)); this.eventDatePreset = 'nextDays'; this.eventReload$.next(); }
  onFixedDateChange(value: string) { this.eventFixedDate = value; this.eventDatePreset = value ? 'fixed' : 'any'; this.eventReload$.next(); }
  private dateOnly(date: Date) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  private getEventDateOptions(now = new Date()): { dateFrom?: string; dateTo?: string } {
    if (this.eventDatePreset === 'any') return {};
    const today = this.dateOnly(now);
    const addDays = (day: string, count: number) => {
      const date = new Date(`${day}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + count);
      return date.toISOString().slice(0, 10);
    };
    const from = this.eventDatePreset === 'fixed' ? this.eventFixedDate :
      this.eventDatePreset === 'tomorrow' ? addDays(today, 1) : today;
    if (!from) return {};
    return { dateFrom: from, dateTo: this.eventDatePreset === 'nextDays' ? addDays(from, this.eventDaysWindow - 1) : from };
  }
  private poiToCard(p: Poi): ExploreCard { return { kind: 'poi', id: p.id, title: p.name, category: p.category, description: p.description,
    sponsored: p.sponsored, source: p.source, website: p.website, address: p.address, phone: p.phone, location: p.location, countyId: p.countyId, imageUrl: p.imageUrl }; }
  private eventToCard(e: AppEvent): ExploreCard { return { kind: 'event', id: e.id, title: e.title, category: 'event', description: e.description,
    sponsored: e.sponsored, source: 'events', website: e.sourceUrl, location: e.location, startTime: new Date(e.startTime),
    endTime: e.endTime ? new Date(e.endTime) : undefined, venue: e.venue, settlement: e.settlement, countyId: e.countyId }; }
}
