import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataAdapter, RawPOIData } from '../interfaces/data-adapter.interface';

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

@Injectable()
export class OSMAdapter implements DataAdapter {
  readonly name = 'osm_overpass_budapest';
  readonly type = 'pois';
  private readonly logger = new Logger(OSMAdapter.name);
  private readonly overpassApis = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  private readonly timeoutMs = 60000;
  private readonly budapestBbox = '47.349,18.900,47.650,19.350';
  private readonly perTileDelayMs = Number(process.env.OSM_REQUEST_DELAY_MS || '1500');
  private readonly maxRetries = Number(process.env.OSM_MAX_RETRIES || '2');
  private readonly maxRecords = Number(process.env.OSM_MAX_RECORDS || '800');

  async fetchData(): Promise<RawPOIData[]> {
    const all: RawPOIData[] = [];
    const seen = new Set<string>();
    const tiles = this.buildTiles(this.budapestBbox, 2, 2);

    for (const tile of tiles) {
      const payload = await this.fetchTile(tile);
      const records = this.parseElements(payload.elements || []);
      for (const record of records) {
        if (seen.has(record.externalId)) continue;
        seen.add(record.externalId);
        all.push(record);
        if (all.length >= this.maxRecords) {
          this.logger.warn(`OSM record cap reached (${this.maxRecords}).`);
          return all;
        }
      }
      await this.delay(this.perTileDelayMs);
    }
    this.logger.log(`Fetched ${all.length} OSM records for Budapest.`);
    return all;
  }

  validateRecord(record: RawPOIData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!record.externalId) errors.push('externalId required');
    if (!record.osmType) errors.push('osmType required');
    if (!record.osmId) errors.push('osmId required');
    if (!record.name) errors.push('name required');
    if (!record.category) errors.push('category required');
    if (!record.settlement) errors.push('settlement required');
    if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)) {
      errors.push('valid coordinates required');
    }
    if (record.latitude < -90 || record.latitude > 90 || record.longitude < -180 || record.longitude > 180) {
      errors.push('coordinates out of range');
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private buildOverpassQuery(bbox: string): string {
    return `
[out:json][timeout:45];
(
  nwr["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park"](${bbox});
  nwr["historic"~"castle|monument|memorial|archaeological_site|ruins|yes"](${bbox});
  nwr["amenity"~"place_of_worship"](${bbox});
  nwr["building"~"castle|church|cathedral|synagogue"](${bbox});
  nwr["leisure"~"park|nature_reserve|garden"](${bbox});
  nwr["natural"~"peak|spring|water|wood|cave_entrance"](${bbox});
);
out tags center;
`;
  }

  private buildTiles(bbox: string, rows: number, cols: number): string[] {
    const parts = bbox.split(',').map(Number);
    const [minLat, minLng, maxLat, maxLng] = parts;
    const latStep = (maxLat - minLat) / rows;
    const lngStep = (maxLng - minLng) / cols;
    const tiles: string[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileMinLat = minLat + row * latStep;
        const tileMaxLat = row === rows - 1 ? maxLat : tileMinLat + latStep;
        const tileMinLng = minLng + col * lngStep;
        const tileMaxLng = col === cols - 1 ? maxLng : tileMinLng + lngStep;
        tiles.push(`${tileMinLat},${tileMinLng},${tileMaxLat},${tileMaxLng}`);
      }
    }
    return tiles;
  }

  private async fetchTile(bbox: string): Promise<OverpassResponse> {
    const query = this.buildOverpassQuery(bbox);
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const endpoint = this.overpassApis[attempt % this.overpassApis.length];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: query,
          signal: controller.signal,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'User-Agent': 'Momap/1.0 (+https://github.com/orig9511/magyarorszag-felfedezo)',
          },
        });
        if (!response.ok) {
          const retryAfter = response.headers.get('retry-after');
          const detail = retryAfter
            ? `Overpass rate limit (${response.status}), retry-after: ${retryAfter}s`
            : `Overpass request failed (${response.status} ${response.statusText})`;
          throw new Error(detail);
        }
        return (await response.json()) as OverpassResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`OSM tile fetch failed for ${bbox}, attempt ${attempt + 1}: ${lastError.message}`);
        await this.delay(800 * (attempt + 1));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new ServiceUnavailableException(`OpenStreetMap Overpass source unavailable: ${lastError?.message ?? 'Unknown error'}`);
  }

  private parseElements(elements: OverpassElement[]): RawPOIData[] {
    const records: RawPOIData[] = [];
    for (const element of elements) {
      const tags = element.tags || {};
      const name = tags.name || tags['name:hu'] || tags.official_name;
      if (!name) {
        continue;
      }
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      const osmId = String(element.id);
      const osmType = element.type;
      const address = this.buildAddress(tags);
      const altNames = this.collectAltNames(tags, name);
      const wikidataQid = tags.wikidata;

      records.push({
        externalId: `${osmType}/${osmId}`,
        name,
        description: tags.description,
        category: this.resolveCategory(tags),
        latitude: latitude as number,
        longitude: longitude as number,
        settlement: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || 'Budapest',
        osmType,
        osmId,
        wikidataQid,
        altNames,
        rawTags: tags,
        externalRefs: wikidataQid ? { wikidata: wikidataQid } : undefined,
        address,
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'] || tags.url,
        sourceUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
        licenseType: 'ODbL-1.0',
        attribution: '© OpenStreetMap contributors',
        importedAt: new Date(),
      });
    }
    return records;
  }

  private resolveCategory(tags: Record<string, string>): string {
    if (tags.historic === 'castle' || tags.building === 'castle') return 'castle';
    if (tags.tourism === 'museum') return 'museum';
    if (tags.tourism === 'viewpoint') return 'viewpoint';
    if (tags.amenity === 'place_of_worship' || tags.building === 'church' || tags.building === 'cathedral') {
      return 'church';
    }
    if (tags.leisure === 'park' || tags.leisure === 'nature_reserve') return 'park';
    if (tags.natural) return `natural:${tags.natural}`;
    if (tags.historic) return `historic:${tags.historic}`;
    if (tags.tourism) return `tourism:${tags.tourism}`;
    return 'tourism:attraction';
  }

  private buildAddress(tags: Record<string, string>): string | undefined {
    const parts = [tags['addr:postcode'], tags['addr:city'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  private collectAltNames(tags: Record<string, string>, primaryName: string): string[] | undefined {
    const candidates = [tags['name:hu'], tags['name:en'], tags.alt_name, tags.official_name]
      .filter((value): value is string => Boolean(value))
      .filter((value) => value !== primaryName);
    return candidates.length > 0 ? [...new Set(candidates)] : undefined;
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
