import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { IngestionService } from "./ingestion.service";
import { DataRetentionService } from "./data-retention.service";
import { AdminTokenGuard } from '../auth/admin-token.guard';
import { OSMAdapter } from "./adapters/osm.adapter";
import { WikidataAdapter } from "./adapters/wikidata.adapter";
import { FirecrawlTicketAdapter } from "./adapters/firecrawl-ticket.adapter";

@UseGuards(AdminTokenGuard)
@Controller("api/ingestion")
export class IngestionController {
  constructor(
    private ingestionService: IngestionService,
    private retention: DataRetentionService,
    private osmAdapter: OSMAdapter,
    private wikidataAdapter: WikidataAdapter,
    private firecrawlTicket: FirecrawlTicketAdapter,
  ) {}

  /**
   * Manually trigger an ingestion job.
   * POST /api/ingestion/run?source=osm
   */
  @Post("run")
  async runIngestion(@Query("source") source: string) {
    if (process.env.MOMAP_INGESTION_ENABLED !== 'true') { throw new BadRequestException('Ingestion disabled pending source compliance review'); }
    if (!source) {
      throw new BadRequestException("source parameter is required");
    }

    let adapter;
    if (source === "osm") {
      adapter = this.osmAdapter;
    } else if (source === "ticket") {
      adapter = this.firecrawlTicket;
    } else if (source === "wikidata") {
      adapter = this.wikidataAdapter;
    } else {
      throw new BadRequestException(`Unknown source: ${source}`);
    }

    try {
      const result = await this.ingestionService.ingestData(adapter);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Read-only preview; requires the existing operator guard. */
  @Get("retention/preview")
  async previewRetention(){ return this.retention.preview(); }

  /**
   * Get ingestion job history.
   * GET /api/ingestion/history?source=osm&limit=10
   */
  @Get("history")
  async getHistory(
    @Query("source") source?: string,
    @Query("limit") limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const jobs = await this.ingestionService.getJobHistory(source, limitNum);
    return jobs;
  }
}
