import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import maplibregl, { GeoJSONSource, LngLatBounds } from "maplibre-gl";
import { CountySummary } from "./county.service";
import { Poi } from "./poi.service";
import { MAP_STYLE } from "../config/map-style";

export interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoom: number;
}

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>;
type LooseGeometry = { type: string; coordinates?: unknown };

@Injectable({
  providedIn: "root",
})
export class MapService {
  private readonly defaultCenter: [number, number] = [19.5033, 47.1625];
  private readonly defaultZoom = 7;
  private map: maplibregl.Map | null = null;

  private readonly viewportSubject = new BehaviorSubject<ViewportBounds>({
    minLat: 45.5,
    maxLat: 48.7,
    minLng: 16,
    maxLng: 23,
    zoom: this.defaultZoom,
  });
  private readonly statusSubject = new BehaviorSubject<string>("initializing");
  private readonly countyClickSubject = new Subject<string>();
  private readonly poiClickSubject = new Subject<string>();

  readonly viewportChange$ = this.viewportSubject.asObservable();
  readonly status$ = this.statusSubject.asObservable();
  readonly countyClick$ = this.countyClickSubject.asObservable();
  readonly poiClick$ = this.poiClickSubject.asObservable();

  private counties: CountySummary[] = [];
  private pois: Poi[] = [];

  initializeMap(container: HTMLElement, center: [number, number], zoom: number) {
    if (this.map) {
      return;
    }

    try {
      this.map = new maplibregl.Map({
        container,
        style: MAP_STYLE,
        center,
        zoom,
      });
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      this.map.on("load", () => {
        this.setupSourcesAndLayers();
        this.syncCountiesToMap();
        this.syncPoisToMap();
        this.emitViewport();
        this.statusSubject.next("ready");
      });

      this.map.on("moveend", () => this.emitViewport());
      this.map.on("error", (e) => this.statusSubject.next(`map error: ${e.error?.message || "unknown"}`));
    } catch (error) {
      this.statusSubject.next(error instanceof Error ? error.message : String(error));
    }
  }

  setCounties(counties: CountySummary[]) {
    this.counties = counties;
    this.syncCountiesToMap();
  }

  setPOIs(pois: Poi[]) {
    this.pois = pois;
    this.syncPoisToMap();
  }

  showCountyDetail(countyId: string, geometry: LooseGeometry) {
    if (!this.map) return;
    const src = this.map.getSource("county-detail") as GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: geometry as GeoJSON.Geometry, properties: { id: countyId } }],
      });
    }
    const bbox = this.getGeometryBounds(geometry);
    if (bbox) {
      this.map.fitBounds(bbox, { padding: 36, duration: 350 });
    }
  }

  clearCountyDetail() {
    if (!this.map) return;
    const src = this.map.getSource("county-detail") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData({ type: "FeatureCollection", features: [] });
  }

  resetView() {
    if (!this.map) return;
    this.map.flyTo({
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      duration: 400,
    });
  }

  selectPOI(id: string | null) {
    if (!this.map || !this.map.getLayer("poi-selected")) return;
    this.map.setFilter("poi-selected", id ? ["==", ["get", "id"], id] : ["==", ["get", "id"], "__none__"]);
  }

  highlightPOI(id: string | null) {
    if (!this.map || !this.map.getLayer("poi-highlight")) return;
    this.map.setFilter("poi-highlight", id ? ["==", ["get", "id"], id] : ["==", ["get", "id"], "__none__"]);
  }

  flyTo(lng: number, lat: number, zoom: number) {
    if (!this.map) return;
    this.map.flyTo({ center: [lng, lat], zoom, duration: 350 });
  }

  fitBoundsToCounty(countyGeometry: LooseGeometry) {
    if (!this.map) return;
    const bounds = this.getGeometryBounds(countyGeometry);
    if (!bounds) return;
    this.map.fitBounds(bounds, { padding: 36, duration: 350 });
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.statusSubject.next("destroyed");
  }

  private emitViewport() {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    this.viewportSubject.next({
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
      zoom: this.map.getZoom(),
    });
  }

  private setupSourcesAndLayers() {
    if (!this.map) return;
    if (!this.map.getSource("counties")) {
      this.map.addSource("counties", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      this.map.addLayer({
        id: "counties-fill",
        type: "fill",
        source: "counties",
        paint: {
          "fill-color": "rgba(198,240,90,0.08)",
          "fill-outline-color": "rgba(198,240,90,0.45)",
        },
      });
    }

    if (!this.map.getSource("county-detail")) {
      this.map.addSource("county-detail", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      this.map.addLayer({
        id: "county-detail-fill",
        type: "fill",
        source: "county-detail",
        paint: {
          "fill-color": "rgba(198,240,90,0.18)",
          "fill-outline-color": "rgba(198,240,90,0.95)",
        },
      });
    }

    if (!this.map.getSource("pois")) {
      this.map.addSource("pois", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      this.map.addLayer({
        id: "pois",
        type: "circle",
        source: "pois",
        paint: {
          "circle-radius": 5,
          "circle-color": "#c6f05a",
          "circle-stroke-color": "#0b130f",
          "circle-stroke-width": 1.5,
        },
      });
      this.map.addLayer({
        id: "poi-highlight",
        type: "circle",
        source: "pois",
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "circle-radius": 8,
          "circle-color": "rgba(198,240,90,0.2)",
          "circle-stroke-color": "#c6f05a",
          "circle-stroke-width": 2,
        },
      });
      this.map.addLayer({
        id: "poi-selected",
        type: "circle",
        source: "pois",
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "circle-radius": 10,
          "circle-color": "rgba(198,240,90,0.25)",
          "circle-stroke-color": "#f2efe6",
          "circle-stroke-width": 2,
        },
      });
    }

    this.map.on("click", "counties-fill", (e) => {
      const id = String(e.features?.[0]?.properties?.["id"] || "");
      if (id) this.countyClickSubject.next(id);
    });

    this.map.on("click", "pois", (e) => {
      const id = String(e.features?.[0]?.properties?.["id"] || "");
      if (id) this.poiClickSubject.next(id);
    });
  }

  private syncCountiesToMap() {
    if (!this.map) return;
    const src = this.map.getSource("counties") as GeoJSONSource | undefined;
    if (!src) return;
    const features: GeoJSON.Feature<GeoJSON.Geometry>[] = this.counties
      .filter((county) => Boolean(county.displayGeometry))
      .map((county) => ({
        type: "Feature",
        geometry: county.displayGeometry as GeoJSON.Geometry,
        properties: { id: county.id, name: county.name },
      }));
    const collection: FeatureCollection = { type: "FeatureCollection", features };
    src.setData(collection);
  }

  private syncPoisToMap() {
    if (!this.map) return;
    const src = this.map.getSource("pois") as GeoJSONSource | undefined;
    if (!src) return;
    const features: GeoJSON.Feature<GeoJSON.Point>[] = this.pois
      .filter((poi) => poi.location?.type === "Point" && Array.isArray(poi.location.coordinates))
      .map((poi) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: poi.location!.coordinates },
        properties: { id: poi.id, name: poi.name, category: poi.category },
      }));
    src.setData({ type: "FeatureCollection", features });
  }

  private getGeometryBounds(geometry: LooseGeometry): LngLatBounds | null {
    const bounds = new LngLatBounds();
    let found = false;
    const extend = (coord: number[]) => {
      if (coord.length >= 2 && Number.isFinite(coord[0]) && Number.isFinite(coord[1])) {
        bounds.extend([coord[0], coord[1]]);
        found = true;
      }
    };
    const visit = (coords: unknown): void => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === "number") {
        extend(coords as number[]);
        return;
      }
      for (const item of coords) {
        visit(item);
      }
    };
    visit(geometry.coordinates);
    return found ? bounds : null;
  }
}
