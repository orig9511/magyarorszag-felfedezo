import type { StyleSpecification } from 'maplibre-gl';

/**
 * Base map style, isolated here so the provider can be swapped without touching the map code.
 *
 * DEVELOPMENT ONLY: this uses the public OSMF raster tile server, whose usage policy does not
 * allow relying on it in production (see docs/research/04-geospatial-data-and-mapping.md §2.2).
 * The planned replacement is a self-hosted Protomaps/PMTiles Hungary extract with its own style.
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
