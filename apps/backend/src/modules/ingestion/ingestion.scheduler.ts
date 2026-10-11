import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IngestionService } from './ingestion.service';
import { OSMAdapter } from './adapters/osm.adapter';
import { WikidataAdapter } from './adapters/wikidata.adapter';

/**
 * Scheduled ingestion jobs.
 * Runs on a periodic basis to keep data fresh.
 */
@Injectable()
export class IngestionScheduler {
  private readonly logger = new Logger(IngestionScheduler.name);

  constructor(
    private ingestionService: IngestionService,
    private osmAdapter: OSMAdapter,
    private wikidataAdapter: WikidataAdapter,
  ) {}

  /**
   * Run OSM ingestion daily at 2 AM UTC.
   * Keeps POI data fresh from OpenStreetMap.
   */
  @Cron('0 2 * * *')
  async runDailyOSMIngestion() {
    this.logger.log('Starting scheduled OSM ingestion');
    try {
      const result = await this.ingestionService.ingestData(this.osmAdapter);
      this.logger.log(`OSM ingestion completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`OSM ingestion failed: ${error}`);
    }
  }

  /**
   * Run Wikidata ingestion weekly on Sunday at 3 AM UTC.
   * Wikidata data changes less frequently; keep query count low per docs.
   */
  @Cron('0 3 * * 0')
  async runWeeklyWikidataIngestion() {
    this.logger.log('Starting scheduled Wikidata ingestion');
    try {
      const result = await this.ingestionService.ingestData(this.wikidataAdapter);
      this.logger.log(`Wikidata ingestion completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Wikidata ingestion failed: ${error}`);
    }
  }
}
