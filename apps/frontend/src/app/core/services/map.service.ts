import { Injectable, NgZone } from '@angular/core';
import type { CountySummary } from './county.service';
import { Observable, Subject } from 'rxjs';
import maplibregl, { GeoJSONSource, LngLatBounds, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { MAP_STYLE } from '../config/map-style';

export interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoom: number;
}

export interface MapPoint {
  id: string;
  name: string;
  category: string;
  location?: { type: 'Point'; coordinates: [number, number] } | null;
}

interface MarkerEntry {
  marker: Marker;
  el: HTMLButtonElement;
}

const MAX_MARKERS = 300; // DOM markers are fine up to a few hundred; the API caps a viewport at 1000
const LABEL_ZOOM = 9; // below this zoom markers are plain dots (labels would overlap)
const COUNTY_SOURCE = 'counties';
const COUNTY_DETAIL_SOURCE = 'county-detail';
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const HUNGARY_CENTER: [number, number] = [19.5033, 47.1625]; // [lng, lat]

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map?: MapLibreMap;
  private resizeObserver?: ResizeObserver;
  private markers = new Map<string, MarkerEntry>();
  private selectedPoiId?: string;
  private readonly poiClick = new Subject<string>();
  private readonly viewport = new Subject<ViewportBounds>();
  private readonly status = new Subject<'ready' | string>();
  private readonly countyClick = new Subject<string>();
  private pendingCounties: GeoJSON.FeatureCollection = EMPTY_FC;
  private hoveredCountyId?: string;
  private selectedCountyId?: string;
  private pendingDetail?: { id: string; geometry: GeoJSON.MultiPolygon };

  /** Emits after every pan/zoom (and once when the map is first ready). */
  readonly viewportChange$: Observable<ViewportBounds> = this.viewport.asObservable();
  /** Emits 'ready' once, or an error message when the base map/tiles fail to load. */
  readonly status$: Observable<string> = this.status.asObservable();

  /** Emits the id of an active county the user clicked (not when a POI marker was hit). */
  readonly countyClick$: Observable<string> = this.countyClick.asObservable();

  /** Emits the id of a POI marker the user clicked. */
  readonly poiClick$: Observable<string> = this.poiClick.asObservable();

  constructor(private zone: NgZone) {}

  initializeMap(container: HTMLElement, center: [number, number] = HUNGARY_CENTER, zoom = 7) {
    this.destroy();
    // Keep MapLibre's frequent mouse/animation events outside Angular change detection.
    this.zone.runOutsideAngular(() => {
      const map = new maplibregl.Map({ container, style: MAP_STYLE, center, zoom, minZoom: 5 });
      this.map = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        this.addCountyLayers(map);
        this.zone.run(() => this.status.next('ready'));
        this.emitViewport();
      });
      const syncLabels = () => map.getContainer().classList.toggle('mm-labels', map.getZoom() >= LABEL_ZOOM);
      map.on('zoom', syncLabels);
      syncLabels();
      map.on('moveend', () => this.emitViewport());
      map.on('error', (e) => {
        const message = e.error?.message ?? 'Map error';
        this.zone.run(() => this.status.next(message));
      });

      // The map sits in a flex layout; window 'resize' alone misses container-only size changes.
      this.resizeObserver = new ResizeObserver(() => map.resize());
      this.resizeObserver.observe(container);
    });
  }

  /** Draws the simplified county overview polygons (inactive ones greyed out and not clickable). */
  setCounties(counties: CountySummary[]) {
    this.pendingCounties = {
      type: 'FeatureCollection',
      features: counties
        .filter((c) => c.displayGeometry)
        .map((c) => ({
          type: 'Feature' as const,
          geometry: c.displayGeometry as GeoJSON.MultiPolygon,
          properties: { id: c.id, name: c.name, code: c.code, active: c.active },
        })),
    };
    (this.map?.getSource(COUNTY_SOURCE) as GeoJSONSource | undefined)?.setData(this.pendingCounties);
  }

  /** Highlights a county with its accurate full-resolution outline and zooms to it. */
  showCountyDetail(countyId: string, geometry: GeoJSON.MultiPolygon) {
    this.pendingDetail = { id: countyId, geometry }; // re-applied once the style has loaded, if needed
    this.applyDetail();
    this.fitBoundsToCounty(geometry);
  }

  clearCountyDetail() {
    this.pendingDetail = undefined;
    this.applyDetail();
  }

  /** Back to the initial country-wide view. */
  resetView() {
    this.map?.flyTo({ center: HUNGARY_CENTER, zoom: 7 });
  }

  private applyDetail() {
    if (!this.map?.getSource(COUNTY_DETAIL_SOURCE)) return;
    this.setSelected(this.pendingDetail?.id);
    (this.map.getSource(COUNTY_DETAIL_SOURCE) as GeoJSONSource).setData(
      this.pendingDetail ? { type: 'Feature', geometry: this.pendingDetail.geometry, properties: {} } : EMPTY_FC,
    );
  }

  /** Syncs the POI markers with the list (adds new, removes stale, keeps existing ones to avoid flicker). */
  setPOIs(pois: MapPoint[]) {
    const map = this.map;
    if (!map) return;
    const wanted = pois.filter((p) => p.location?.type === 'Point').slice(0, MAX_MARKERS);
    const ids = new Set(wanted.map((p) => p.id));
    for (const [id, entry] of this.markers) {
      if (!ids.has(id)) {
        entry.marker.remove();
        this.markers.delete(id);
      }
    }
    for (const poi of wanted) {
      if (this.markers.has(poi.id)) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `mm-marker mm-cat-${poi.category}`;
      el.setAttribute('aria-label', poi.name);
      el.innerHTML = '<span class="mm-dot" aria-hidden="true"></span><span class="mm-label"></span>';
      (el.querySelector('.mm-label') as HTMLElement).textContent = poi.name;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.zone.run(() => this.poiClick.next(poi.id));
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(poi.location!.coordinates as [number, number])
        .addTo(map);
      this.markers.set(poi.id, { marker, el });
    }
    this.applySelected();
  }

  /** Hover highlight from the results list (null clears). */
  highlightPOI(id: string | null) {
    for (const [pid, { el }] of this.markers) el.classList.toggle('is-hover', pid === id);
  }

  /** Persistent selected state (null clears). */
  selectPOI(id: string | null) {
    this.selectedPoiId = id ?? undefined;
    this.applySelected();
  }

  private applySelected() {
    for (const [pid, { el }] of this.markers) {
      const on = pid === this.selectedPoiId;
      el.classList.toggle('is-selected', on);
      el.style.zIndex = on ? '5' : '';
      el.setAttribute('aria-pressed', String(on));
    }
  }

  flyTo(lng: number, lat: number, zoom = 14) {
    this.map?.flyTo({ center: [lng, lat], zoom });
  }

  fitBoundsToCounty(countyGeometry: GeoJSON.Geometry) {
    const bounds = new LngLatBounds();
    const visit = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === 'number') bounds.extend(c as [number, number]);
      else if (Array.isArray(c)) c.forEach(visit);
    };
    if ('coordinates' in countyGeometry) visit(countyGeometry.coordinates);
    if (!bounds.isEmpty()) this.map?.fitBounds(bounds, { padding: 40 });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.markers.forEach(({ marker }) => marker.remove());
    this.markers.clear();
    this.selectedPoiId = undefined;
    this.map?.remove();
    this.map = undefined;
    this.hoveredCountyId = undefined;
    this.selectedCountyId = undefined;
    this.pendingDetail = undefined;
  }

  private setSelected(id?: string) {
    if (!this.map?.getSource(COUNTY_SOURCE)) return;
    if (this.selectedCountyId) this.map.setFeatureState({ source: COUNTY_SOURCE, id: this.selectedCountyId }, { selected: false });
    this.selectedCountyId = id;
    if (id) this.map.setFeatureState({ source: COUNTY_SOURCE, id }, { selected: true });
  }

  private addCountyLayers(map: MapLibreMap) {
    map.addSource(COUNTY_SOURCE, { type: 'geojson', data: this.pendingCounties, promoteId: 'id' });
    map.addSource(COUNTY_DETAIL_SOURCE, { type: 'geojson', data: EMPTY_FC });
    this.applyDetail();

    // Subtle tint so the basemap and POI markers (added later, drawn on top) stay readable.
    map.addLayer({
      id: 'county-fill',
      type: 'fill',
      source: COUNTY_SOURCE,
      paint: {
        'fill-color': ['case', ['get', 'active'], '#667eea', '#9e9e9e'],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 0.2,
          ['boolean', ['feature-state', 'hover'], false], 0.25,
          ['get', 'active'], 0.08,
          0.04,
        ],
      },
    });
    map.addLayer({
      id: 'county-outline',
      type: 'line',
      source: COUNTY_SOURCE,
      paint: {
        'line-color': ['case', ['get', 'active'], '#4a55b8', '#8a8a8a'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 10, 1.6],
        'line-opacity': 0.85,
      },
    });
    map.addLayer({
      id: 'county-detail-outline',
      type: 'line',
      source: COUNTY_DETAIL_SOURCE,
      paint: { 'line-color': '#764ba2', 'line-width': 3 },
    });

    const tooltip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
    const setHover = (id?: string) => {
      if (id === this.hoveredCountyId) return;
      if (this.hoveredCountyId) map.setFeatureState({ source: COUNTY_SOURCE, id: this.hoveredCountyId }, { hover: false });
      this.hoveredCountyId = id;
      if (id) map.setFeatureState({ source: COUNTY_SOURCE, id }, { hover: true });
    };

    map.on('mousemove', 'county-fill', (e) => {
      const f = e.features?.[0];
      if (!f) {
        setHover(undefined);
        tooltip.remove();
        return;
      }
      const active = !!f.properties?.['active'];
      setHover(active ? String(f.id) : undefined);
      map.getCanvas().style.cursor = active ? 'pointer' : '';
      tooltip.setLngLat(e.lngLat).setText(String(f.properties?.['name'] ?? '')).addTo(map);
    });
    map.on('mouseleave', 'county-fill', () => {
      setHover(undefined);
      tooltip.remove();
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'county-fill', (e) => {
      const f = e.features?.[0];
      if (!f || !f.properties?.['active']) return;
      this.zone.run(() => this.countyClick.next(String(f.id)));
    });
  }

  private emitViewport() {
    if (!this.map) return;
    const b = this.map.getBounds();
    const bounds: ViewportBounds = {
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
      zoom: this.map.getZoom(),
    };
    this.zone.run(() => this.viewport.next(bounds));
  }
}
