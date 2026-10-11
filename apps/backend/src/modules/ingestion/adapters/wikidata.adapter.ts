import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataAdapter, RawPOIData } from '../interfaces/data-adapter.interface';

type SparqlBindingValue = { type: string; value: string };
type SparqlBinding = Record<string, SparqlBindingValue>;
type SparqlResponse = { results?: { bindings?: SparqlBinding[] } };

@Injectable()
export class WikidataAdapter implements DataAdapter {
  readonly name = 'wikidata';
  readonly type = 'pois';
  private readonly logger = new Logger(WikidataAdapter.name);
  private readonly endpoint = 'https://query.wikidata.org/sparql';
  private readonly timeoutMs = 55000;

  async fetchData(): Promise<RawPOIData[]> {
    const query = this.buildQuery();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.endpoint}?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'Momap/1.0 (+https://github.com/orig9511/magyarorszag-felfedezo)',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(`Wikidata query failed (${response.status} ${response.statusText})`);
      }
      const payload = (await response.json()) as SparqlResponse;
      const records = this.parse(payload);
      this.logger.log(`Fetched ${records.length} Wikidata records for Budapest area.`);
      return records;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(`Wikidata source unavailable: ${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  validateRecord(record: RawPOIData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!record.externalId) errors.push('externalId required');
    if (!record.wikidataQid) errors.push('wikidataQid required');
    if (!record.name) errors.push('name required');
    if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)) errors.push('valid coordinates required');
    if (record.latitude < -90 || record.latitude > 90 || record.longitude < -180 || record.longitude > 180) {
      errors.push('coordinates out of range');
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private buildQuery(): string {
    return `
SELECT ?item ?itemLabel ?itemDescription ?coord ?website ?osmId ?instanceLabel
WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerWest "Point(18.900 47.349)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerEast "Point(19.350 47.650)"^^geo:wktLiteral .
  }
  ?item wdt:P31/wdt:P279* ?instance .
  VALUES ?instance {
    wd:Q33506
    wd:Q23413
    wd:Q16970
    wd:Q839954
    wd:Q570116
  }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P402 ?osmId . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "hu,en" . }
}
LIMIT 500
`;
  }

  private parse(payload: SparqlResponse): RawPOIData[] {
    const bindings = payload.results?.bindings || [];
    const records: RawPOIData[] = [];

    for (const binding of bindings) {
      const qid = this.extractQid(binding.item?.value);
      if (!qid) continue;
      const coord = this.parsePoint(binding.coord?.value);
      if (!coord) continue;

      const label = binding.itemLabel?.value;
      if (!label) continue;

      const instance = binding.instanceLabel?.value;
      const description = binding.itemDescription?.value;
      const website = binding.website?.value;
      const osmId = binding.osmId?.value;

      records.push({
        externalId: qid,
        name: label,
        description,
        category: instance ? `wikidata:${instance}` : 'wikidata:landmark',
        latitude: coord.lat,
        longitude: coord.lon,
        settlement: 'Budapest',
        wikidataQid: qid,
        externalRefs: osmId ? { osmRelationId: osmId } : undefined,
        sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
        website,
        licenseType: 'CC0-1.0',
        attribution: 'Wikidata contributors',
        importedAt: new Date(),
      });
    }
    return records;
  }

  private extractQid(value?: string): string | null {
    if (!value) return null;
    const qid = value.split('/').pop();
    return qid && /^Q\d+$/.test(qid) ? qid : null;
  }

  private parsePoint(value?: string): { lon: number; lat: number } | null {
    if (!value) return null;
    const match = value.match(/Point\(([^ ]+) ([^)]+)\)/);
    if (!match) return null;
    const lon = Number(match[1]);
    const lat = Number(match[2]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return { lon, lat };
  }
}
