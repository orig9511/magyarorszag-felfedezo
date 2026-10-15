/** Shared identities keep cards, map features and future saved-place references aligned. */
export type DiscoveryKind = 'poi' | 'event';
export type MapMode = 'overview' | 'transition' | 'roam';
export interface DiscoveryLocation { type: string; coordinates: [number, number] }
export interface MapPlace { kind: DiscoveryKind; id: string; title: string; category: string; location?: DiscoveryLocation }
export interface SearchBounds { minLat: number; maxLat: number; minLng: number; maxLng: number; zoom: number }
export const HUNGARY_EXTENT: [[number, number], [number, number]] = [[16.05, 45.70], [22.95, 48.65]];
export const placeKey = (place: Pick<MapPlace, 'kind' | 'id'>): string => `${place.kind}:${place.id}`;
export function hasMapLocation(place: Pick<MapPlace, 'location'>): boolean {
  const c = place.location?.coordinates;
  return place.location?.type === 'Point' && Array.isArray(c) && c.length === 2 &&
    Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
}
export function viewportKey(bounds: SearchBounds, filters: unknown): string {
  // Never round the request bounds: distinct viewports must not reuse clipped edge results.
  return JSON.stringify([bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng, Math.floor(bounds.zoom), filters]);
}
export function visiblePlaces<T extends MapPlace>(places: T[], bounds: SearchBounds): T[] {
  return places.filter((p) => {
    if (!hasMapLocation(p)) return false;
    const [lng, lat] = p.location!.coordinates;
    return lng >= bounds.minLng && lng <= bounds.maxLng && lat >= bounds.minLat && lat <= bounds.maxLat;
  });
}
