import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import maplibregl, { GeoJSONSource, LngLatBounds } from 'maplibre-gl';
import { CountySummary } from './county.service';
import { MAP_STYLE } from '../config/map-style';
import { HUNGARY_EXTENT, MapMode, MapPlace, SearchBounds, hasMapLocation, placeKey } from './discovery.model';

export interface ViewportBounds extends SearchBounds {}
type LooseGeometry = { type: string; coordinates?: unknown };

@Injectable({ providedIn: 'root' })
export class MapService {
  private map: maplibregl.Map | null = null;
  private loaded = false;
  private resizeObserver?: ResizeObserver;
  private transitionEnd?: () => void;
  private pendingCounty?: { id: string; geometry: LooseGeometry };
  private readonly viewportSubject = new Subject<ViewportBounds>();
  private readonly statusSubject = new BehaviorSubject<string>('initializing');
  private readonly modeSubject = new BehaviorSubject<MapMode>('overview');
  private readonly countyClickSubject = new Subject<string>();
  private readonly placeClickSubject = new Subject<string>();
  readonly viewportChange$ = this.viewportSubject.asObservable();
  readonly status$ = this.statusSubject.asObservable();
  readonly mode$ = this.modeSubject.asObservable();
  readonly countyClick$ = this.countyClickSubject.asObservable();
  readonly placeClick$ = this.placeClickSubject.asObservable();
  private counties: CountySummary[] = [];
  private places: MapPlace[] = [];
  private placesSignature = '';

  initializeMap(container: HTMLElement, _center?: [number, number], _zoom?: number) {
    if (this.map) return;
    this.modeSubject.next('overview');
    this.statusSubject.next('initializing');
    try {
      this.map = new maplibregl.Map({ container, style: MAP_STYLE, center: [19.5, 47.2], zoom: 6,
        renderWorldCopies: false, dragPan: false, scrollZoom: false, boxZoom: false,
        dragRotate: false, keyboard: false, doubleClickZoom: false, touchZoomRotate: false, touchPitch: false });
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      this.lockNavigation(true);
      this.map.fitBounds(HUNGARY_EXTENT, { padding: 34, duration: 0 });
      // Geometry interaction must not wait for the public raster server to finish loading tiles.
      this.map.on('style.load', () => {
        if (this.loaded) return;
        this.loaded = true;
        this.setupLayers();
        this.syncCounties();
        this.syncPlaces();
        this.statusSubject.next('ready');
        if (this.pendingCounty) this.focusCounty();
      });
      this.map.on('movestart', () => { if (this.modeSubject.value === 'roam') this.statusSubject.next('moving'); });
      this.map.on('moveend', () => { this.statusSubject.next('ready'); this.emitViewport(); });
      this.map.on('error', (e) => this.statusSubject.next(`map error: ${e.error?.message || 'Ismeretlen térképhiba'}`));
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.map || container.clientWidth === 0 || container.clientHeight === 0) return;
        this.map.resize();
        if (this.modeSubject.value === 'overview') this.map.fitBounds(HUNGARY_EXTENT, { padding: 34, duration: 0 });
      });
      this.resizeObserver.observe(container);
    } catch (e) { this.statusSubject.next(e instanceof Error ? e.message : String(e)); }
  }

  setCounties(counties: CountySummary[]) { this.counties = counties; this.syncCounties(); }
  setPlaces(places: MapPlace[]) {
    const signature = JSON.stringify(places.map(p => [placeKey(p), p.location, p.title, p.category]));
    if (signature === this.placesSignature) return;
    this.placesSignature = signature;
    this.places = places;
    this.syncPlaces();
  }
  showCountyDetail(id: string, geometry: LooseGeometry) {
    this.pendingCounty = { id, geometry };
    if (this.loaded) this.focusCounty();
  }
  clearCountyDetail() {
    this.pendingCounty = undefined;
    this.source('county-detail')?.setData({ type: 'FeatureCollection', features: [] });
  }
  resetView() {
    if (!this.map) return;
    this.cancelTransition();
    this.clearCountyDetail();
    this.modeSubject.next('overview');
    this.lockNavigation(true);
    this.setPlaces([]);
    this.map.fitBounds(HUNGARY_EXTENT, { padding: 34, duration: this.duration() });
  }
  selectPlace(key: string | null) { this.setPlaceFilter('place-selected', key); }
  highlightPlace(key: string | null) { this.setPlaceFilter('place-highlight', key); }
  flyTo(lng: number, lat: number, zoom: number) {
    if (this.modeSubject.value === 'roam') this.map?.flyTo({ center: [lng, lat], zoom, duration: this.duration() });
  }
  destroy() {
    this.cancelTransition(); this.resizeObserver?.disconnect(); this.resizeObserver = undefined;
    this.map?.remove(); this.map = null; this.loaded = false; this.pendingCounty = undefined;
    this.places = []; this.placesSignature = ''; this.counties = []; this.modeSubject.next('overview'); this.statusSubject.next('destroyed');
  }
  private duration() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550; }
  private source(id: string) { return this.map?.getSource(id) as GeoJSONSource | undefined; }
  private lockNavigation(locked: boolean) {
    const m = this.map; if (!m) return;
    for (const handler of [m.dragPan, m.scrollZoom, m.boxZoom, m.keyboard, m.doubleClickZoom, m.touchZoomRotate]) {
      if (locked) handler.disable(); else handler.enable();
    }
    // Keep a north-up 2D map in both modes.
    m.dragRotate.disable(); m.touchZoomRotate.disableRotation(); m.touchPitch.disable();
    m.getContainer().querySelectorAll<HTMLButtonElement>('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out')
      .forEach((button) => { button.disabled = locked; button.setAttribute('aria-disabled', String(locked)); });
  }
  private cancelTransition() {
    if (this.transitionEnd) this.map?.off('moveend', this.transitionEnd);
    this.transitionEnd = undefined;
    this.map?.stop();
  }
  private focusCounty() {
    const county = this.pendingCounty, m = this.map;
    if (!county || !m) return;
    const bounds = this.geometryBounds(county.geometry); if (!bounds) return;
    this.cancelTransition();
    this.modeSubject.next('transition'); this.lockNavigation(true);
    this.source('county-detail')?.setData({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: county.geometry as GeoJSON.Geometry, properties: { id: county.id } },
    ] });
    const complete = () => {
      if (this.transitionEnd !== complete) return;
      m.off('moveend', complete); this.transitionEnd = undefined;
      this.modeSubject.next('roam'); this.lockNavigation(false); this.emitViewport();
    };
    this.transitionEnd = complete;
    m.on('moveend', complete);
    m.fitBounds(bounds, { padding: 42, duration: this.duration() });
    // A no-op fit can have no movement, including reduced-motion selection at identical bounds.
    if (!m.isMoving()) complete();
  }
  private emitViewport() {
    if (!this.map || this.modeSubject.value !== 'roam') return;
    const b = this.map.getBounds();
    this.viewportSubject.next({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast(), zoom: this.map.getZoom() });
  }
  private setupLayers() {
    const m = this.map!;
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    m.addSource('country-mask', { type: 'geojson', data: empty });
    m.addLayer({ id: 'country-mask', type: 'fill', source: 'country-mask', paint: { 'fill-color': '#070b09', 'fill-opacity': 0.72 } });
    m.addSource('counties', { type: 'geojson', data: empty });
    m.addLayer({ id: 'counties-fill', type: 'fill', source: 'counties', paint: {
      'fill-color': ['case', ['==', ['get', 'active'], true], '#c6f05a', '#6a756c'], 'fill-opacity': 0.09,
      'fill-outline-color': '#9cae83', } });
    m.addLayer({ id: 'county-hover', type: 'line', source: 'counties', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#e6ffac', 'line-width': 3 } });
    m.addSource('county-detail', { type: 'geojson', data: empty });
    m.addLayer({ id: 'county-detail', type: 'line', source: 'county-detail', paint: { 'line-color': '#c6f05a', 'line-width': 2.5 } });
    m.addSource('places', { type: 'geojson', data: empty, cluster: true, clusterMaxZoom: 13, clusterRadius: 45, promoteId: 'key' });
    m.addLayer({ id: 'place-clusters', type: 'circle', source: 'places', filter: ['has', 'point_count'], paint: {
      'circle-color': '#c6f05a', 'circle-radius': ['step', ['get', 'point_count'], 17, 20, 23, 100, 29], 'circle-stroke-width': 2, 'circle-stroke-color': '#102017' } });
    // HTML counts avoid relying on glyph endpoints in the current raster-only style.
    m.addLayer({ id: 'places', type: 'circle', source: 'places', filter: ['!', ['has', 'point_count']], paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 14, 7],
      'circle-color': ['case', ['==', ['get', 'kind'], 'event'], '#93c7ff', '#c6f05a'], 'circle-stroke-color': '#0b130f', 'circle-stroke-width': 1.5 } });
    for (const [id, radius] of [['place-highlight', 10], ['place-selected', 13]] as const) {
      m.addLayer({ id, type: 'circle', source: 'places', filter: ['==', ['get', 'key'], ''], paint: {
        'circle-radius': radius, 'circle-color': 'rgba(198,240,90,0.2)', 'circle-stroke-color': '#fff9e5', 'circle-stroke-width': 2 } });
    }
    m.on('click', 'counties-fill', (e) => {
      if (this.modeSubject.value === 'roam') return;
      const f = e.features?.[0]; if (f?.properties?.['active']) this.countyClickSubject.next(String(f.properties['id']));
    });
    m.on('mousemove', 'counties-fill', (e) => {
      const f = e.features?.[0]; const enabled = this.modeSubject.value !== 'roam' && f?.properties?.['active'];
      m.getCanvas().style.cursor = enabled ? 'pointer' : '';
      m.setFilter('county-hover', ['==', ['get', 'id'], enabled ? String(f?.properties?.['id']) : '']);
    });
    m.on('mouseleave', 'counties-fill', () => { m.getCanvas().style.cursor = ''; m.setFilter('county-hover', ['==', ['get', 'id'], '']); });
    m.on('click', 'places', (e) => { const key = e.features?.[0]?.properties?.['key']; if (key) this.placeClickSubject.next(String(key)); });
    m.on('click', 'place-clusters', async (e) => {
      const f = e.features?.[0]; if (!f || f.geometry.type !== 'Point') return;
      try {
        const zoom = await this.source('places')!.getClusterExpansionZoom(Number(f.properties?.['cluster_id']));
        if (this.map === m && this.modeSubject.value === 'roam') m.easeTo({ center: f.geometry.coordinates as [number, number], zoom, duration: this.duration() });
      } catch { /* Source may have changed while a cluster was being expanded. */ }
    });
  }
  private syncCounties() {
    const src = this.source('counties'); if (!src) return;
    const features: GeoJSON.Feature[] = this.counties.filter(c => c.displayGeometry).map(c => ({ type: 'Feature',
      geometry: c.displayGeometry as GeoJSON.Geometry, properties: { id: c.id, name: c.name, active: c.active } }));
    src.setData({ type: 'FeatureCollection', features });
    const holes: number[][][] = [];
    for (const feature of features) {
      if (feature.geometry.type === 'MultiPolygon') holes.push(...feature.geometry.coordinates.map(p => p[0]));
      else if (feature.geometry.type === 'Polygon') holes.push(feature.geometry.coordinates[0]);
    }
    this.source('country-mask')?.setData({ type: 'FeatureCollection', features: holes.length ? [{ type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]], ...holes] }, properties: {} }] : [] });
  }
  private syncPlaces() {
    this.source('places')?.setData({ type: 'FeatureCollection', features: this.places.filter(hasMapLocation).map(p => ({
      type: 'Feature', id: placeKey(p), geometry: { type: 'Point', coordinates: p.location!.coordinates },
      properties: { key: placeKey(p), kind: p.kind, title: p.title, category: p.category },
    })) });
  }
  private setPlaceFilter(layer: string, key: string | null) { if (this.map?.getLayer(layer)) this.map.setFilter(layer, ['==', ['get', 'key'], key ?? '']); }
  private geometryBounds(geometry: LooseGeometry): LngLatBounds | null {
    const bounds = new LngLatBounds(); let found = false;
    const visit = (c: unknown): void => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number' && typeof c[1] === 'number' && Number.isFinite(c[0]) && Number.isFinite(c[1])) { bounds.extend([c[0],c[1]]); found = true; }
      else c.forEach(visit);
    };
    visit(geometry.coordinates); return found ? bounds : null;
  }
}
