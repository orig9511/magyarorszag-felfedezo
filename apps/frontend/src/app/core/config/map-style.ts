import type { StyleSpecification } from 'maplibre-gl';

/**
 * Base map style, isolated here so the provider can be swapped without touching the map code.
 *
 * DEVELOPMENT CONFIGURATION: the public OSMF raster endpoint is best-effort, without an SLA.
 * Commercial use is not categorically forbidden, but the tile policy must be followed.
 * Production provider selection is pending; see docs/research/P0-map-provider-audit.md.
 * Self-hosted Protomaps/PMTiles is a candidate, not an approved infrastructure decision.
 * Whatever replaces it must keep the attribution below (or the provider's own) visible.
 */
export const MAP_STYLE: StyleSpecification = {
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
