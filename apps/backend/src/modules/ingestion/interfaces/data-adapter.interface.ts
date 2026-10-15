export interface RawEventData {
  externalId: string;
  title: string;
  description?: string;
  category?: string;
  eventType?: string;
  timezone?: string;
  startTime: Date;
  endTime?: Date;
  venue?: string;
  latitude?: number;
  longitude?: number;
  settlement: string;
  performers?: string[];
  sourceUrl?: string;
  officialEventUrl?: string;
  ticketUrl?: string;
  sourceName?: string;
  status?: "active" | "cancelled" | "postponed" | "draft";
  lastCheckedAt?: Date;
  licenseType?: string;
  attribution?: string;
}

export interface RawPOIData {
  externalId: string;
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  settlement: string;
  address?: string;
  phone?: string;
  website?: string;
  sourceUrl?: string;
  licenseType?: string;
  attribution?: string;
}

export interface IngestionResult {
  source: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

export interface DataAdapter {
  readonly name: string;
  readonly type: "events" | "pois";

  /**
   * Fetch and parse raw data from the source.
   * Should handle timeouts, rate limits, and partial failures gracefully.
   */
  fetchData(): Promise<RawEventData[] | RawPOIData[]>;

  /**
   * Validate a single raw record before ingestion.
   */
  validateRecord(record: RawEventData | RawPOIData): {
    valid: boolean;
    errors?: string[];
  };
}
