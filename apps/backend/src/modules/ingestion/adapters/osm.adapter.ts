import { Injectable, Logger } from "@nestjs/common";
import { DataAdapter, RawPOIData } from "../interfaces/data-adapter.interface";

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

      const text = await response.text();
      const pois = this.parseOverpassXML(text);
      this.logger.log(`Fetched ${pois.length} POIs from Overpass`);
      return pois;
    } catch (error) {
      this.logger.error(`Overpass fetch failed: ${error}`);
      // Return empty array on error to allow partial ingestion
      return [];
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
    const bbox = "47.5,21.6,47.55,21.7"; // rough Debrecen area

    return `
[out:xml];
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

  private parseOverpassXML(xmlText: string): RawPOIData[] {
    const pois: RawPOIData[] = [];

    try {
      // Simple regex-based parsing (XML library not available in basic NestJS)
      // In production, use a proper XML parser like xml2js
      const nodeMatches = xmlText.matchAll(
        /<node id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>(.*?)<\/node>/gs,
      );

      for (const match of nodeMatches) {
        const osm_id = match[1];
        const lat = parseFloat(match[2]);
        const lon = parseFloat(match[3]);
        const tagsXml = match[4];

        const nameMatch = tagsXml.match(/<tag k="name" v="([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : `POI ${osm_id}`;

        const categoryMatch = tagsXml.match(
          /<tag k="(?:amenity|tourism|historic)" v="([^"]+)"/,
        );
        const category = categoryMatch ? categoryMatch[1] : "attraction";

        const descriptionMatch = tagsXml.match(
          /<tag k="description" v="([^"]+)"/,
        );
        const description = descriptionMatch ? descriptionMatch[1] : undefined;

        const websiteMatch = tagsXml.match(/<tag k="website" v="([^"]+)"/);
        const website = websiteMatch ? websiteMatch[1] : undefined;

        const phoneMatch = tagsXml.match(/<tag k="phone" v="([^"]+)"/);
        const phone = phoneMatch ? phoneMatch[1] : undefined;

        pois.push({
          externalId: `node/${osm_id}`,
          name,
          category,
          latitude: lat,
          longitude: lon,
          settlement: "Debrecen", // TODO: geocode from coordinates
          description,
          website,
          phone,
          sourceUrl: `https://www.openstreetmap.org/node/${osm_id}`,
          licenseType: "ODbL",
          attribution: "OpenStreetMap contributors",
        });
      }
    } catch (error) {
      this.logger.error(`Failed to parse Overpass XML: ${error}`);
    }

    return pois;
  }
}
