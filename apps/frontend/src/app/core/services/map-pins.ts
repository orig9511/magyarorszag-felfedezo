import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import { categoryVisual, type CategoryVisual } from '../config/category-visuals';
import { type MapPlace, hasMapLocation, placeKey } from './discovery.model';

const SVG_NS = 'http://www.w3.org/2000/svg';
export function categoryIcon(visual: CategoryVisual): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(name, value);
  for (const [tag, attributes] of visual.icon) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    svg.appendChild(node);
  }
  return svg;
}

/** Native button semantics provide Enter/Space activation and a single-tap touch action. */
export function createPin(place: MapPlace, activate: (keyboard: boolean) => void, hover: (active: boolean) => void): HTMLButtonElement {
  const visual = categoryVisual(place);
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'momap-pin';
  button.style.setProperty('--category-color', visual.color);
  button.setAttribute('aria-label', `${place.title} – ${visual.label}`);
  button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-haspopup', 'dialog');
  const glyph = document.createElement('span'); glyph.className = 'momap-pin-glyph';
  const shape = document.createElementNS(SVG_NS, 'svg');
  shape.setAttribute('viewBox', '0 0 40 48'); shape.setAttribute('aria-hidden', 'true');
  const outline = document.createElementNS(SVG_NS, 'path');
  outline.setAttribute('d', 'M20 46C16 40 3 30 3 19a17 17 0 1 1 34 0c0 11-13 21-17 27Z');
  shape.appendChild(outline); glyph.appendChild(shape);
  const face = document.createElement('span'); face.className = 'momap-pin-face'; face.appendChild(categoryIcon(visual)); glyph.appendChild(face);
  const tooltip = document.createElement('span'); tooltip.className = 'momap-pin-tooltip';
  tooltip.id = `pin-tooltip-${encodeURIComponent(placeKey(place))}`; tooltip.setAttribute('role', 'tooltip');
  tooltip.textContent = `${place.title} · ${visual.label}`;
  button.setAttribute('aria-describedby', tooltip.id); button.append(glyph, tooltip);
  button.addEventListener('click', event => { event.stopPropagation(); activate(event.detail === 0); });
  button.addEventListener('dblclick', event => event.stopPropagation());
  button.addEventListener('mouseenter', () => hover(true)); button.addEventListener('mouseleave', () => hover(false));
  button.addEventListener('focus', () => hover(true)); button.addEventListener('blur', () => hover(false));
  return button;
}

interface PinRecord { marker: maplibregl.Marker; button: HTMLButtonElement; signature: string }

/** Only visible unclustered features and visible clusters get keyed, reusable DOM buttons. */
export class MapPins {
  private records = new Map<string, PinRecord>();
  private places = new Map<string, MapPlace>();
  private selectedKey: string | null = null;
  private hoveredKey: string | null = null;
  private popup?: maplibregl.Popup;
  private popupKey?: string;
  private frame?: number;
  private revision = 0;
  private destroyed = false;
  private readonly sourceChanged = (event: { sourceId?: string }) => { if (event.sourceId === 'places') this.schedule(); };
  private readonly settled = () => this.schedule();

  constructor(private map: maplibregl.Map, private select: (key: string) => void, private details: (key: string) => void, private closed: () => void) {
    map.on('sourcedata', this.sourceChanged); map.on('moveend', this.settled); map.on('idle', this.settled);
  }
  setPlaces(places: MapPlace[]) {
    this.revision++;
    this.places = new Map(places.filter(hasMapLocation).map(p => [placeKey(p), p]));
    // Remove obsolete buttons immediately; the worker may not have rebuilt source tiles yet.
    for (const [key, record] of this.records) if (key.startsWith('cluster:') || !this.places.has(key)) { record.marker.remove(); this.records.delete(key); }
    if (this.selectedKey && !this.places.has(this.selectedKey)) this.selectPlace(null);
    this.schedule();
  }
  schedule() {
    if (this.frame !== undefined || this.destroyed) return;
    this.frame = requestAnimationFrame(() => { this.frame = undefined; this.sync(); });
  }
  sync() {
    if (this.destroyed) return;
    let features: maplibregl.MapGeoJSONFeature[];
    try { features = this.map.querySourceFeatures('places'); } catch { return; }
    const bounds = this.map.getBounds(), visible = new Set<string>();
    for (const feature of features) {
      if (feature.geometry.type !== 'Point') continue;
      const position = feature.geometry.coordinates as [number, number];
      if (!bounds.contains(position)) continue;
      const properties = feature.properties ?? {};
      const cluster = Boolean(properties['cluster']);
      const key = cluster ? `cluster:${this.revision}:${properties['cluster_id']}` : String(properties['key']);
      const place = cluster ? undefined : this.places.get(key);
      if ((!cluster && !place) || visible.has(key)) continue;
      visible.add(key);
      const signature = JSON.stringify(cluster ? [properties['point_count'], position] : [place?.title, place?.category, position]);
      let record = this.records.get(key);
      if (record && record.signature !== signature) { record.marker.remove(); this.records.delete(key); record = undefined; }
      if (!record) {
        const button = cluster
          ? this.clusterButton(Number(properties['cluster_id']), Number(properties['point_count']), position)
          : createPin(place!, keyboard => {
            this.select(key);
            if (keyboard) this.popup?.getElement().querySelector<HTMLButtonElement>('.maplibregl-popup-close-button')?.focus({ preventScroll: true });
          }, active => this.highlightPlace(active ? key : null));
        const marker = new maplibregl.Marker({ element: button, anchor: cluster ? 'center' : 'bottom' }).setLngLat(position).addTo(this.map);
        record = { marker, button, signature }; this.records.set(key, record);
      }
      this.applyState(key, record.button);
    }
    for (const [key, record] of this.records) if (!visible.has(key)) { record.marker.remove(); this.records.delete(key); }
  }
  selectPlace(key: string | null) {
    this.selectedKey = key;
    for (const [id, record] of this.records) this.applyState(id, record.button);
    if (key === this.popupKey && this.popup?.isOpen()) return;
    this.closePopup();
    const place = key ? this.places.get(key) : undefined;
    if (!place?.location) return;
    const visual = categoryVisual(place), content = document.createElement('section');
    content.className = 'momap-popup-body'; content.style.setProperty('--category-color', visual.color);
    const category = document.createElement('p'); category.className = 'momap-popup-category'; category.textContent = visual.label;
    const heading = document.createElement('h2'); heading.textContent = place.title;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Részletek a listában';
    button.addEventListener('click', () => this.details(key!)); content.append(category, heading, button);
    const popup = new maplibregl.Popup({ className: 'momap-place-popup', maxWidth: '280px', focusAfterOpen: false,
      offset: { center: [0, -24], top: [0, 0], bottom: [0, -48], left: [22, -24], right: [-22, -24], 'top-left': [16, 0], 'top-right': [-16, 0], 'bottom-left': [16, -42], 'bottom-right': [-16, -42] },
    }).setLngLat(place.location.coordinates).setDOMContent(content).addTo(this.map);
    this.popup = popup; this.popupKey = key!;
    popup.getElement().setAttribute('role', 'dialog');
    popup.getElement().setAttribute('aria-label', place.title);
    const close = popup.getElement().querySelector<HTMLButtonElement>('.maplibregl-popup-close-button');
    close?.setAttribute('aria-label', 'Találat bezárása');
    popup.on('close', () => {
      if (this.popup !== popup) return;
      this.popup = undefined; this.popupKey = undefined; this.selectedKey = null;
      for (const [id, record] of this.records) this.applyState(id, record.button);
      this.closed();
      this.records.get(key!)?.button.focus({ preventScroll: true });
    });
  }
  highlightPlace(key: string | null) {
    this.hoveredKey = key;
    for (const [id, record] of this.records) this.applyState(id, record.button);
  }
  destroy() {
    this.destroyed = true;
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.map.off('sourcedata', this.sourceChanged); this.map.off('moveend', this.settled); this.map.off('idle', this.settled);
    this.closePopup();
    for (const record of this.records.values()) record.marker.remove();
    this.records.clear(); this.places.clear();
  }
  private closePopup() {
    const popup = this.popup, key = this.popupKey;
    const restoreFocus = popup?.getElement().contains(document.activeElement);
    this.popup = undefined; this.popupKey = undefined; popup?.remove();
    if (restoreFocus && key) this.records.get(key)?.button.focus({ preventScroll: true });
  }
  private applyState(key: string, button: HTMLButtonElement) {
    button.classList.toggle('is-selected', key === this.selectedKey);
    button.classList.toggle('is-highlighted', key === this.hoveredKey);
    button.setAttribute('aria-pressed', String(key === this.selectedKey));
  }
  private clusterButton(id: number, count: number, position: [number, number]) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'momap-cluster';
    button.textContent = String(count); button.setAttribute('aria-label', `${count} találat. Nagyítás a csoportra.`);
    const revision = this.revision;
    button.addEventListener('click', async event => {
      event.stopPropagation();
      try {
        const zoom = await (this.map.getSource('places') as GeoJSONSource).getClusterExpansionZoom(id);
        if (!this.destroyed && this.revision === revision) this.map.easeTo({ center: position, zoom, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400 });
      } catch { /* Source replaced while expanding; wait for the next settled feature set. */ }
    });
    return button;
  }
}
