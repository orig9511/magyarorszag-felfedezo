import { Controller, Post, Get, Query, BadRequestException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { OSMAdapter } from './adapters/osm.adapter';
import { WikidataAdapter } from './adapters/wikidata.adapter';
import { TicketmasterAdapter } from './adapters/ticketmaster.adapter';

@Controller('api/ingestion')
export class IngestionController {
  constructor(
    private ingestionService: IngestionService,
    private osmAdapter: OSMAdapter,
    private wikidataAdapter: WikidataAdapter,
    private ticketmasterAdapter: TicketmasterAdapter,
  ) {}

  /**
   * Manually trigger an ingestion job.
   * POST /api/ingestion/run?source=osm
   */
  @Post('run')
  async runIngestion(@Query('source') source: string) {
    if (!source) {
      throw new BadRequestException('source parameter is required');
    }

    let adapter;
    if (source === 'osm') {
      adapter = this.osmAdapter;
    } else if (source === 'wikidata') {
      adapter = this.wikidataAdapter;
    } else if (source === 'ticketmaster') {
      adapter = this.ticketmasterAdapter;
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

  /**
   * Get ingestion job history.
   * GET /api/ingestion/history?source=osm&limit=10
   */
  @Get('history')
  async getHistory(
    @Query('source') source?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const jobs = await this.ingestionService.getJobHistory(source, limitNum);
    return jobs;
  }
}
