import { Injectable, NgZone } from '@angular/core';
import type { CountySummary } from './county.service';
import { Observable, Subject } from 'rxjs';
import maplibregl, { GeoJSONSource, LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';

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

// DEVELOPMENT ONLY base map: OSMF raster tiles. Their usage policy forbids relying on them in
// production (see docs/research/04-geospatial-data-and-mapping.md §2.2); swap this style for the
// self-hosted PMTiles / paid provider before launch.
const DEV_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const POI_SOURCE = 'pois';
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
  private pendingPOIs: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  private readonly viewport = new Subject<ViewportBounds>();
  private readonly status = new Subject<'ready' | string>();
  private readonly countyClick = new Subject<string>();
  private pendingCounties: GeoJSON.FeatureCollection = EMPTY_FC;
  private hoveredCountyId?: string;
  private selectedCountyId?: string;

  /** Emits after every pan/zoom (and once when the map is first ready). */
  readonly viewportChange$: Observable<ViewportBounds> = this.viewport.asObservable();
  /** Emits 'ready' once, or an error message when the base map/tiles fail to load. */
  readonly status$: Observable<string> = this.status.asObservable();

  /** Emits the id of an active county the user clicked (not when a POI marker was hit). */
  readonly countyClick$: Observable<string> = this.countyClick.asObservable();

  constructor(private zone: NgZone) {}

  initializeMap(container: HTMLElement, center: [number, number] = HUNGARY_CENTER, zoom = 7) {
    this.destroy();
    // Keep MapLibre's frequent mouse/animation events outside Angular change detection.
    this.zone.runOutsideAngular(() => {
      const map = new maplibregl.Map({ container, style: DEV_STYLE, center, zoom, minZoom: 5 });
      this.map = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        this.addCountyLayers(map);
        map.addSource(POI_SOURCE, { type: 'geojson', data: this.pendingPOIs });
        map.addLayer({
          id: 'poi-points',
          type: 'circle',
          source: POI_SOURCE,
          paint: {
            'circle-radius': 7,
            'circle-color': '#667eea',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
        map.on('mouseenter', 'poi-points', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'poi-points', () => (map.getCanvas().style.cursor = ''));
        map.on('click', 'poi-points', (e) => {
          const f = e.features?.[0];
          if (!f || f.geometry.type !== 'Point') return;
          new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates as [number, number])
            .setText(String(f.properties?.['name'] ?? ''))
            .addTo(map);
        });
        this.zone.run(() => this.status.next('ready'));
        this.emitViewport();
      });
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
    this.setSelected(countyId);
    (this.map?.getSource(COUNTY_DETAIL_SOURCE) as GeoJSONSource | undefined)?.setData({
      type: 'Feature',
      geometry,
      properties: {},
    });
    this.fitBoundsToCounty(geometry);
  }

  clearCountyDetail() {
    this.setSelected(undefined);
    (this.map?.getSource(COUNTY_DETAIL_SOURCE) as GeoJSONSource | undefined)?.setData(EMPTY_FC);
  }

  /** Replaces the POI markers; safe to call before the style has loaded. */
  setPOIs(pois: MapPoint[]) {
    this.pendingPOIs = {
      type: 'FeatureCollection',
      features: pois
        .filter((p) => p.location?.type === 'Point')
        .map((p) => ({
          type: 'Feature' as const,
          geometry: p.location as GeoJSON.Point,
          properties: { id: p.id, name: p.name, category: p.category },
        })),
    };
    const source = this.map?.getSource(POI_SOURCE) as GeoJSONSource | undefined;
    source?.setData(this.pendingPOIs);
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
    this.map?.remove();
    this.map = undefined;
    this.hoveredCountyId = undefined;
    this.selectedCountyId = undefined;
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
    const hitsPOI = (p: maplibregl.PointLike) =>
      map.getLayer('poi-points') ? map.queryRenderedFeatures(p, { layers: ['poi-points'] }).length > 0 : false;
    const setHover = (id?: string) => {
      if (id === this.hoveredCountyId) return;
      if (this.hoveredCountyId) map.setFeatureState({ source: COUNTY_SOURCE, id: this.hoveredCountyId }, { hover: false });
      this.hoveredCountyId = id;
      if (id) map.setFeatureState({ source: COUNTY_SOURCE, id }, { hover: true });
    };

    map.on('mousemove', 'county-fill', (e) => {
      const f = e.features?.[0];
      if (!f || hitsPOI(e.point)) {
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
      if (!f || !f.properties?.['active'] || hitsPOI(e.point)) return;
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
