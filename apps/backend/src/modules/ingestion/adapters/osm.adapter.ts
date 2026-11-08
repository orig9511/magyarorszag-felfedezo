import { Injectable, Logger } from "@nestjs/common";
import { DataAdapter, RawPOIData } from "../interfaces/data-adapter.interface";
import { selectedIngestionRegion, withinRegion } from "../region-config";
import { normalizeOsmCategory } from "../poi-taxonomy";

/**
 * OSM POI adapter using Overpass API.
 * Per documentation: use for POI ingestion, keep separate source tracking.
 * ODbL 1.0 license: do not merge/deduplicate with proprietary data.
 *
 * TODO: Replace with Geofabrik extract processing for better performance.
 */
@Injectable()
export class OSMAdapter implements DataAdapter {
  readonly name = "osm_overpass";
  readonly type = "pois";
  private readonly logger = new Logger(OSMAdapter.name);
  private readonly OVERPASS_API = "https://overpass-api.de/api/interpreter";
  private readonly REQUEST_TIMEOUT = 60000;

  async fetchData(): Promise<RawPOIData[]> {
    // Query for POIs in Debrecen area (lat/lon bounds)
    // This is a simplified query for attractions, restaurants, accommodation
    const query = this.buildOverpassQuery();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT,
    );

    try {
      this.logger.log("Fetching POI data from Overpass API");
      const response = await fetch(this.OVERPASS_API, {
        method: "POST",
        body: query,
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Momap/1.0 (+https://github.com/orig9511/magyarorszag-felfedezo)",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Overpass API error: ${response.status} ${response.statusText}`,
        );
      }

      const payload: unknown = await response.json();
      const pois = this.parseOverpassJSON(payload);
      this.logger.log(`Fetched ${pois.length} POIs from Overpass`);
      return pois;
    } catch (error) {
      this.logger.error(`Overpass fetch failed: ${error}`);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  validateRecord(record: RawPOIData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!record.externalId) errors.push("externalId required");
    if (!record.name) errors.push("name required");
    if (!record.category) errors.push("category required");
    if (record.latitude === undefined || record.longitude === undefined) {
      errors.push("latitude/longitude required");
    }
    if (!record.settlement) errors.push("settlement required");

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private buildOverpassQuery(): string {
    // Query for Debrecen area (simplified bounds)
    // TODO: Make this configurable per region
    const bbox = selectedIngestionRegion().bbox.join(",");

    return `
[out:json][timeout:55];
(
  node["amenity"~"restaurant|cafe|bar|pub|fast_food"](${bbox});
  node["tourism"~"attraction|hotel|hostel|guest_house|museum"](${bbox});
  node["historic"~"monument|castle|ruins|archaeological_site"](${bbox});
  way["amenity"~"restaurant|cafe|bar|pub|fast_food"](${bbox});
  way["tourism"~"attraction|hotel|hostel|guest_house|museum"](${bbox});
  way["historic"~"monument|castle|ruins|archaeological_site"](${bbox});
);
out center;
`;
  }

  private parseOverpassJSON(payload: unknown): RawPOIData[] {
    if (!payload || typeof payload !== 'object' || !('elements' in payload) ||
        !Array.isArray((payload as {elements:unknown}).elements)) {
      throw new Error('Invalid Overpass JSON response');
    }
    const elements=(payload as {elements:unknown[]}).elements;
    const results:RawPOIData[]=[];
    const seen=new Set<string>();
    const region=selectedIngestionRegion();
    for(const item of elements) {
      if(!item || typeof item!=='object')continue;
      const el=item as {type?:string;id?:number;lat?:number;lon?:number;
        center?:{lat?:number;lon?:number};tags?:Record<string,string>};
      if(!['node','way','relation'].includes(el.type||'') || !Number.isSafeInteger(el.id))continue;
      const id=el.type+'/'+el.id;
      if(seen.has(id))continue;
      const tags=el.tags||{};
      const name=tags['name:hu']||tags.name;
      const category=normalizeOsmCategory(tags);
      const lat=el.type==='node'?el.lat:el.center?.lat;
      const lon=el.type==='node'?el.lon:el.center?.lon;
      if(!name || !category || typeof lat!=='number'||typeof lon!=='number'||
         !withinRegion(lat,lon,region))continue;
      seen.add(id);
      results.push({
        externalId:id,name,category,latitude:lat,longitude:lon,
        // Geographic matching must be reviewed before import is approved.
        settlement:region.settlement,
        description:tags.description,website:tags.website,phone:tags.phone,
        address:[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' ')||undefined,
        sourceUrl:'https://www.openstreetmap.org/'+id,
        licenseType:'ODbL',attribution:'© OpenStreetMap contributors',
      });
    }
    return results;
  }
}
