import { difference, union, type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';

export interface AreaGeometry { type: string; coordinates?: unknown }

function polygonCoordinates(geometry: AreaGeometry): MultiPolygon {
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') throw new Error('Expected polygon geography');
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons)) throw new Error('Missing polygon coordinates');
  return polygons.map(polygon => {
    if (!Array.isArray(polygon) || !polygon.length) throw new Error('Missing polygon exterior');
    return polygon.map(ring => {
      if (!Array.isArray(ring) || ring.length < 3) throw new Error('Invalid polygon ring');
      const points: Ring = ring.map(p => {
        if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error('Invalid polygon position');
        return [p[0], p[1]];
      });
      // A cloned closed ring: preserve every legitimate polygon and interior ring, never mutate API data.
      if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) points.push([...points[0]]);
      return points;
    });
  });
}

/** Union complete county polygons, including holes, then subtract coverage from the Mercator world. */
export function buildCountryMask(geometries: AreaGeometry[]): GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> {
  if (!geometries.length) return { type: 'FeatureCollection', features: [] };
  const areas = geometries.map(polygonCoordinates);
  const coverage = union(areas[0], ...areas.slice(1));
  if (!coverage.length) throw new Error('Polygon coverage is empty');
  const world: Polygon = [[[-180, -85.0511287798], [180, -85.0511287798], [180, 85.0511287798], [-180, 85.0511287798], [-180, -85.0511287798]]];
  const mask = difference(world, coverage);
  return { type: 'FeatureCollection', features: mask.length ? [{ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: mask }, properties: {} }] : [] };
}
