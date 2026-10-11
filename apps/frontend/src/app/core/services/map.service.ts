import { Injectable, NgZone } from '@angular/core';
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

  /** Emits after every pan/zoom (and once when the map is first ready). */
  readonly viewportChange$: Observable<ViewportBounds> = this.viewport.asObservable();
  /** Emits 'ready' once, or an error message when the base map/tiles fail to load. */
  readonly status$: Observable<string> = this.status.asObservable();

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
