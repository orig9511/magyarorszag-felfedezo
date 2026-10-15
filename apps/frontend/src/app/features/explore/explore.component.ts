import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { BehaviorSubject, Subject, EMPTY, catchError, combineLatest, distinctUntilChanged, filter, map, of, switchMap, takeUntil, tap, timer } from 'rxjs';
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

type DatePreset = 'any' | 'today' | 'tomorrow' | 'nextDays' | 'fixed';
interface ExploreCard extends MapPlace {
  description?: string; sponsored?: boolean; source?: string; website?: string; address?: string; phone?: string;
  startTime?: Date; endTime?: Date; venue?: string; settlement?: string; countyId?: string; imageUrl?: string;
}
interface SearchResult { cards: ExploreCard[]; eventError: string; poiError: string }
const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-explore', standalone: true,
  imports: [CommonModule, RouterLink, CategoryIconComponent, LucideAngularModule],
  templateUrl: './explore.component.html', styleUrls: ['./explore.component.scss'],
})
export class ExploreComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = ICONS;
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLElement>;
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
  private cache = new Map<string, { at: number; value: SearchResult }>();

  constructor(private mapService: MapService, private poiService: POIService, private eventService: EventService,
    private countyService: CountyService, private route: ActivatedRoute, private router: Router) {}

  get hasActiveFilters() { return this.selectedCategories.size > 0 || this.contentMode !== 'all' || this.eventDatePreset !== 'nextDays' || this.eventDaysWindow !== 7; }
  get showEventDateFilters() { return this.contentMode !== 'pois'; }
  get introAttractions() { return this.visibleCards.filter(c => c.kind === 'poi' && c.countyId === this.selectedCounty?.id).slice(0, 3); }
  get introEvents() { return this.visibleCards.filter(c => c.kind === 'event' && c.countyId === this.selectedCounty?.id && c.startTime && c.startTime.getTime() >= Date.now()).slice(0, 3); }
  get countyAttribution() { return this.selectedCounty?.attribution || this.counties.find(c => c.attribution)?.attribution || ''; }
  categoryLabel(key: string) { return key === 'event' ? 'Esemény' : this.categoryOptions.find(c => c.key === key)?.name ?? key; }
  hasCategory(key: string) { return this.selectedCategories.has(key); }
  cardKey(_index: number, card: ExploreCard) { return placeKey(card); }
  safeUrl(url?: string | null) { return url && /^https?:\/\//i.test(url) ? url : null; }
  osmLink(card: ExploreCard) { const c = card.location?.coordinates; return c ? `https://www.openstreetmap.org/?mlat=${c[1]}&mlon=${c[0]}#map=17/${c[1]}/${c[0]}` : null; }
  formatEventDate(date?: Date) { return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(date) : ''; }

  ngOnInit() {
    this.mapService.mode$.pipe(takeUntil(this.destroy$)).subscribe(mode => {
      this.mode = mode;
      if (mode !== 'roam') { this.visibleCards = []; this.selectedCard = undefined; this.mapService.setPlaces([]); }
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
      if (card) { this.selectCard(card, false); this.mobileView = 'list'; }
    });
    // Outer switchMap cancels on movement/filter change immediately; only the new request waits 400 ms.
    this.reload$.pipe(switchMap(() => {
      if (this.mode !== 'roam' || this.moving || !this.viewport) return EMPTY;
      return timer(400).pipe(switchMap(() => {
        const v = { ...this.viewport! }, categories = [...this.selectedCategories].sort();
        const key = viewportKey(v, [categories, this.contentMode, this.eventDatePreset, this.eventDaysWindow, this.eventFixedDate]);
        this.poiState = 'loading';
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.at < 60000) return of(cached.value);
        const pois = this.contentMode === 'events' ? of({ pois: [] as Poi[], error: '' }) :
          this.poiService.getPOIsByViewport(v.minLat, v.maxLat, v.minLng, v.maxLng, categories.length ? categories : undefined).pipe(
            map(pois => ({ pois, error: '' })), catchError(() => of({ pois: [] as Poi[], error: 'A helyek nem tölthetők be. Próbáld újra.' })));
        const events = this.contentMode === 'pois' ? of({ events: [] as AppEvent[], error: '' }) :
          this.eventService.getEventsByViewport(v.minLat, v.minLng, v.maxLat, v.maxLng, { days: this.getEventDays() }).pipe(
            map(events => ({ events, error: '' })), catchError(() => of({ events: [] as AppEvent[], error: 'Az események nem tölthetők be. Próbáld újra.' })));
        return combineLatest([pois, events]).pipe(map(([p, e]): SearchResult => {
          const cards = visiblePlaces([...p.pois.map(poi => this.poiToCard(poi)),
            ...this.filterEvents(e.events).map(event => this.eventToCard(event))], v)
            .sort((a,b) => a.title.localeCompare(b.title, 'hu') || placeKey(a).localeCompare(placeKey(b)));
          const result = { cards, eventError: e.error, poiError: p.error };
          if (!p.error && !e.error) {
            if (this.cache.size >= 20) this.cache.delete(this.cache.keys().next().value!);
            this.cache.set(key, { at: Date.now(), value: result });
          }
          return result;
        }));
      }));
    }), takeUntil(this.destroy$)).subscribe(result => {
      this.visibleCards = result.cards; this.eventError = result.eventError; this.poiError = result.poiError;
      this.resultLimit = 20; this.poiState = result.poiError && result.eventError ? 'error' : 'ready';
      this.mapService.setPlaces(result.cards);
      if (this.selectedCard) { this.selectedCard = result.cards.find(c => placeKey(c) === placeKey(this.selectedCard!)); this.mapService.selectPlace(this.selectedCard ? placeKey(this.selectedCard) : null); }
    });
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
  retry() { this.cache.clear(); this.reload$.next(); }
  selectCard(card: ExploreCard, fly: boolean) {
    this.selectedCard = card; this.mapService.selectPlace(placeKey(card));
    const c = card.location?.coordinates;
    if (fly && c) { this.mapService.flyTo(c[0], c[1], Math.max(this.mapZoom, 12)); this.mobileView = 'map'; }
  }
  closeDetail() { this.selectedCard = undefined; this.mapService.selectPlace(null); }
  hoverCard(card: ExploreCard | null) { this.mapService.highlightPlace(card ? placeKey(card) : null); }
  setMobileView(view: 'map' | 'list') { this.mobileView = view; }
  setEventDatePreset(preset: DatePreset) { this.eventDatePreset = preset; if (preset !== 'fixed') this.eventFixedDate = ''; this.reload$.next(); }
  onEventDaysWindowChange(days: number) { this.eventDaysWindow = Math.max(1, Math.min(30, days)); this.eventDatePreset = 'nextDays'; this.reload$.next(); }
  onFixedDateChange(value: string) { this.eventFixedDate = value; this.eventDatePreset = value ? 'fixed' : 'any'; this.reload$.next(); }
  private getEventDays() { return this.eventDatePreset === 'today' ? 1 : this.eventDatePreset === 'tomorrow' ? 2 : this.eventDatePreset === 'nextDays' ? this.eventDaysWindow : 60; }
  private dateOnly(date: Date) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  private filterEvents(events: AppEvent[]) {
    const now = new Date(), today = this.dateOnly(now);
    const tomorrow = this.dateOnly(new Date(now.getTime() + 86400000));
    return events.filter(e => {
      const start = new Date(e.startTime); if (!Number.isFinite(start.getTime())) return false;
      const day = this.dateOnly(start);
      if (this.eventDatePreset === 'today') return day === today;
      if (this.eventDatePreset === 'tomorrow') return day === tomorrow;
      if (this.eventDatePreset === 'fixed' && this.eventFixedDate) return day === this.eventFixedDate;
      return true;
    });
  }
  private poiToCard(p: Poi): ExploreCard { return { kind: 'poi', id: p.id, title: p.name, category: p.category, description: p.description,
    sponsored: p.sponsored, source: p.source, website: p.website, address: p.address, phone: p.phone, location: p.location, countyId: p.countyId, imageUrl: p.imageUrl }; }
  private eventToCard(e: AppEvent): ExploreCard { return { kind: 'event', id: e.id, title: e.title, category: 'event', description: e.description,
    sponsored: e.sponsored, source: 'events', website: e.sourceUrl, location: e.location, startTime: new Date(e.startTime),
    endTime: e.endTime ? new Date(e.endTime) : undefined, venue: e.venue, settlement: e.settlement, countyId: e.countyId }; }
}
