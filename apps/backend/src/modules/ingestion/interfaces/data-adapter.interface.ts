export interface RawEventData {
  externalId: string;
  title: string;
  description?: string;
  eventType?: string;
  category?: string;
  startTime: Date;
  endTime?: Date;
  timezone?: string;
  venue?: string;
  latitude?: number;
  longitude?: number;
  settlement: string;
  performers?: string[];
  officialEventUrl?: string;
  ticketUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  licenseType?: string;
  attribution?: string;
  status?: 'active' | 'cancelled' | 'postponed' | 'draft';
  lastCheckedAt?: Date;
  isTestData?: boolean;
}

export interface RawPOIData {
  externalId: string;
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  settlement: string;
  osmType?: 'node' | 'way' | 'relation';
  osmId?: string;
  wikidataQid?: string;
  altNames?: string[];
  rawTags?: Record<string, string>;
  externalRefs?: Record<string, string>;
  address?: string;
  phone?: string;
  website?: string;
  sourceUrl?: string;
  licenseType?: string;
  attribution?: string;
  importedAt?: Date;
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
  readonly type: 'events' | 'pois';

  /**
   * Fetch and parse raw data from the source.
   * Should handle timeouts, rate limits, and partial failures gracefully.
   */
  fetchData(): Promise<RawEventData[] | RawPOIData[]>;

  /**
   * Validate a single raw record before ingestion.
   */
  validateRecord(record: RawEventData | RawPOIData): { valid: boolean; errors?: string[] };
}
