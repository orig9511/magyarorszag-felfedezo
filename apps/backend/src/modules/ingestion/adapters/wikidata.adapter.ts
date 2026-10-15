import { Injectable, Logger } from "@nestjs/common";
import { DataAdapter, RawPOIData } from "../interfaces/data-adapter.interface";

/**
 * Wikidata POI adapter using SPARQL endpoint.
 * Per documentation: CC0 structured data, keep source tracking for attribution.
 * Rate limits: 5 parallel queries per IP, 60s timeout.
 * Queries are split by county to avoid timeout.
 */
@Injectable()
export class WikidataAdapter implements DataAdapter {
  readonly name = "wikidata";
  readonly type = "pois";
  private readonly logger = new Logger(WikidataAdapter.name);
  private readonly WDQS_ENDPOINT = "https://query.wikidata.org/sparql";
  private readonly REQUEST_TIMEOUT = 55000; // Stay under 60s limit

  async fetchData(): Promise<RawPOIData[]> {
    // Query for cultural and historic POIs in Hajdú-Bihar county
    // TODO: Make region/settlement configurable
    const query = this.buildSPARQLQuery();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT,
    );

    try {
      this.logger.log("Fetching POI data from Wikidata");
      const response = await fetch(
        `${this.WDQS_ENDPOINT}?query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/sparql-results+json",
            "User-Agent":
              "Momap/1.0 (+https://github.com/orig9511/magyarorszag-felfedezo)",
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Wikidata API error: ${response.status} ${response.statusText}`,
        );
      }

      const json = await response.json();
      const pois = this.parseSPARQLResults(json);
      this.logger.log(`Fetched ${pois.length} POIs from Wikidata`);
      return pois;
    } catch (error) {
      this.logger.error(`Wikidata fetch failed: ${error}`);
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  validateRecord(record: RawPOIData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!record.externalId) errors.push("externalId required");
    if (!record.name) errors.push("name required");
    if (record.latitude === undefined || record.longitude === undefined) {
      errors.push("latitude/longitude required");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private buildSPARQLQuery(): string {
    // Query for museums, historic monuments, cultural sites in Hungary
    // Simplified to Debrecen/Hajdú-Bihar area
    return `
SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?website WHERE {
  ?item wdt:P131 wd:Q28 .
  ?item wdt:P625 ?coord .
  {
    ?item wdt:P31 wd:Q33506 .
  } UNION {
    ?item wdt:P31 wd:Q811430 .
  } UNION {
    ?item wdt:P31 wd:Q1371819 .
  }

  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?item wdt:P856 ?website . }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,hu" . }
}
LIMIT 100
`;
  }

  private parseSPARQLResults(json: any): RawPOIData[] {
    const pois: RawPOIData[] = [];

    try {
      if (!json.results || !json.results.bindings) {
        this.logger.warn("Unexpected Wikidata response format");
        return pois;
      }

      for (const binding of json.results.bindings) {
        const itemUri = binding.item?.value;
        const name = binding.itemLabel?.value;
        const description = binding.itemDescription?.value;
        const coordStr = binding.coord?.value; // Format: Point(lon lat)
        const website = binding.website?.value;

        if (!itemUri || !name || !coordStr) continue;

        // Parse Point(lon lat) format
        const coordMatch = coordStr.match(/Point\(([^ ]+)\s+([^ ]+)\)/);
        if (!coordMatch) continue;

        const lon = parseFloat(coordMatch[1]);
        const lat = parseFloat(coordMatch[2]);
        if (isNaN(lat) || isNaN(lon)) continue;

        const qId = itemUri.split("/").pop() || "";

        pois.push({
          externalId: qId,
          name,
          category: "cultural", // Wikidata items are cultural
          latitude: lat,
          longitude: lon,
          settlement: "Debrecen", // TODO: geocode or use location hierarchies
          description,
          website,
          sourceUrl: `https://www.wikidata.org/wiki/${qId}`,
          licenseType: "cc0",
          attribution: "Wikidata contributors",
        });
      }
    } catch (error) {
      this.logger.error(`Failed to parse Wikidata results: ${error}`);
    }

    return pois;
  }
}
