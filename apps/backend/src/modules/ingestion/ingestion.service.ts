import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJob, IngestionJobStatus } from './entities/ingestion-job.entity';
import { Event } from '../event/event.entity';
import { POI } from '../poi/poi.entity';
import { County } from '../county/county.entity';
import { SettlementService } from '../settlement/settlement.service';
import { DataAdapter, RawEventData, RawPOIData, IngestionResult } from './interfaces/data-adapter.interface';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private static readonly BUDAPEST_TIMEZONE = 'Europe/Budapest';
  private readonly activeSources = new Set<string>();
  private readonly minIntervalMinutes = Number(process.env.INGEST_MIN_INTERVAL_MINUTES || '30');
  private readonly maxItemsPerRun = Number(process.env.INGEST_MAX_ITEMS_PER_RUN || '800');

  constructor(
    @InjectRepository(IngestionJob) private ingestionJobRepo: Repository<IngestionJob>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(POI) private poiRepo: Repository<POI>,
    @InjectRepository(County) private countyRepo: Repository<County>,
    private settlementService: SettlementService,
  ) {}

  /**
   * Run a data adapter and ingest its data.
   */
  async ingestData(adapter: DataAdapter): Promise<IngestionResult> {
    await this.guardRunAllowed(adapter.name);
    this.activeSources.add(adapter.name);
    const jobRecord = await this.createJobRecord(adapter.name);
    const startedAt = new Date();

    try {
      this.logger.log(`Starting ingestion from ${adapter.name}`);

      const allRawData = await adapter.fetchData();
      const cappedData = allRawData.slice(0, this.maxItemsPerRun);
      const preSkipped = allRawData.length - cappedData.length;
      this.logger.log(`Fetched ${allRawData.length} records from ${adapter.name}; processing ${cappedData.length}`);

      let itemsCreated = 0;
      let itemsUpdated = 0;
      let itemsSkipped = preSkipped;
      let itemsFailed = 0;
      const errors: string[] = [];
      if (preSkipped > 0) {
        errors.push(`Run cap reached (${this.maxItemsPerRun}); skipped ${preSkipped} records.`);
      }

      for (const record of cappedData) {
        try {
          const validation = adapter.validateRecord(record);
          if (!validation.valid) {
            itemsSkipped++;
            this.logger.warn(`Validation failed for ${adapter.name}/${record.externalId}: ${validation.errors?.join(', ')}`);
            errors.push(`${record.externalId}: ${validation.errors?.join(', ')}`);
            continue;
          }

          if (adapter.type === 'events') {
            const result = await this.ingestEvent(adapter.name, record as RawEventData);
            if (result.created) itemsCreated++;
            else if (result.updated) itemsUpdated++;
            else itemsSkipped++;
          } else if (adapter.type === 'pois') {
            const result = await this.ingestPOI(adapter.name, record as RawPOIData);
            if (result.created) itemsCreated++;
            else if (result.updated) itemsUpdated++;
            else itemsSkipped++;
          }
        } catch (error) {
          itemsFailed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to ingest record ${record.externalId}: ${errorMsg}`);
          errors.push(`${record.externalId}: ${errorMsg}`);
        }
      }

      const completedAt = new Date();
      await this.updateJobRecord(jobRecord.id, {
        status: itemsFailed > 0 ? IngestionJobStatus.PARTIAL_FAILURE : IngestionJobStatus.COMPLETED,
        runCompletedAt: completedAt,
        itemsProcessed: cappedData.length,
        itemsCreated,
        itemsUpdated,
        itemsSkipped,
        itemsFailed,
        errorSummary: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : undefined,
      });

      return {
        source: adapter.name,
        itemsProcessed: cappedData.length,
        itemsCreated,
        itemsUpdated,
        itemsSkipped,
        itemsFailed,
        errors,
        startedAt,
        completedAt,
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateJobRecord(jobRecord.id, {
        status: IngestionJobStatus.FAILED,
        runCompletedAt: completedAt,
        errorSummary: errorMsg,
      });
      this.logger.error(`Ingestion failed for ${adapter.name}: ${errorMsg}`);
      throw error;
    } finally {
      this.activeSources.delete(adapter.name);
    }
  }

  /**
   * Ingest a single event record.
   */
  private async ingestEvent(
    sourceAdapter: string,
    record: RawEventData,
  ): Promise<{ created: boolean; updated: boolean }> {
    const countyId = await this.resolveCountyId(record.settlement);
    if (!countyId) {
      throw new Error(`No county found for settlement: ${record.settlement}`);
    }

    // Check for duplicate by source + sourceId
    const existing = await this.eventRepo.findOne({
      where: { source: sourceAdapter, sourceId: record.externalId },
    });

    const eventData = {
      title: record.title,
      description: record.description || undefined,
      category: record.category || 'other',
      eventType: record.eventType || undefined,
      startTime: record.startTime,
      endTime: record.endTime,
      venue: record.venue,
      timezone: record.timezone || IngestionService.BUDAPEST_TIMEZONE,
      location: this.toPoint(record.longitude, record.latitude),
      countyId,
      settlement: record.settlement,
      performers: record.performers?.join(', '),
      source: sourceAdapter,
      sourceId: record.externalId,
      sourceUrl: record.sourceUrl,
      officialEventUrl: record.officialEventUrl,
      ticketUrl: record.ticketUrl,
      licenseType: record.licenseType,
      attribution: record.attribution,
      retrievedAt: new Date(),
      status: record.status || 'active',
      lastCheckedAt: record.lastCheckedAt || new Date(),
      isTestData: Boolean(record.isTestData),
    };

    if (existing) {
      await this.eventRepo.update(existing.id, eventData);
      return { created: false, updated: true };
    } else {
      const event = this.eventRepo.create(eventData);
      await this.eventRepo.save(event);
      return { created: true, updated: false };
    }
  }

  /**
   * Ingest a single POI record.
   */
  private async ingestPOI(
    sourceAdapter: string,
    record: RawPOIData,
  ): Promise<{ created: boolean; updated: boolean }> {
    const countyId = await this.resolveCountyId(record.settlement);
    if (!countyId) {
      throw new Error(`No county found for settlement: ${record.settlement}`);
    }

    // Check for duplicate by source + sourceId
    const existing = await this.poiRepo.findOne({
      where: { source: sourceAdapter, sourceId: record.externalId },
    });

    const poiData = {
      name: record.name,
      description: record.description || undefined,
      category: record.category,
      location: this.toPoint(record.longitude, record.latitude),
      countyId,
      address: record.address,
      phone: record.phone,
      website: record.website,
      osmType: record.osmType,
      osmId: record.osmId,
      wikidataQid: record.wikidataQid,
      altNames: record.altNames && record.altNames.length > 0 ? record.altNames : undefined,
      rawTags: record.rawTags,
      externalRefs: record.externalRefs,
      attribution: record.attribution,
      source: sourceAdapter,
      sourceId: record.externalId,
      importedAt: record.importedAt || new Date(),
    };

    if (sourceAdapter === 'wikidata' && record.wikidataQid) {
      const osmLinkedPoi = await this.poiRepo.findOne({
        where: { wikidataQid: record.wikidataQid, source: 'osm_overpass_budapest' },
      });
      if (osmLinkedPoi) {
        await this.poiRepo.update(osmLinkedPoi.id, {
          description: poiData.description || osmLinkedPoi.description,
          category: poiData.category || osmLinkedPoi.category,
          website: poiData.website || osmLinkedPoi.website,
          externalRefs: { ...(osmLinkedPoi.externalRefs || {}), ...(poiData.externalRefs || {}) },
          importedAt: poiData.importedAt,
        });
        return { created: false, updated: true };
      }
    }

    if (sourceAdapter === 'wikidata') {
      const candidateMatches = await this.findOsmCandidates(record.name, record.longitude, record.latitude);
      if (candidateMatches.length > 0) {
        poiData.externalRefs = {
          ...(poiData.externalRefs || {}),
          candidateOsmPoiIds: candidateMatches.join(','),
        };
      }
    }

    if (existing) {
      await this.poiRepo.update(existing.id, poiData);
      return { created: false, updated: true };
    } else {
      const poi = this.poiRepo.create(poiData);
      await this.poiRepo.save(poi);
      return { created: true, updated: false };
    }
  }

  /**
   * Resolve settlement name to county ID using SettlementService.
   */
  private async resolveCountyId(settlement: string): Promise<string | null> {
    return this.settlementService.resolveCountyId(settlement);
  }

  private async createJobRecord(sourceAdapter: string): Promise<IngestionJob> {
    const job = this.ingestionJobRepo.create({
      sourceAdapter,
      status: IngestionJobStatus.RUNNING,
      runStartedAt: new Date(),
    });
    return this.ingestionJobRepo.save(job);
  }

  private async updateJobRecord(jobId: string, updates: Partial<IngestionJob>): Promise<void> {
    await this.ingestionJobRepo.update(jobId, updates);
  }

  /**
   * Get ingestion history.
   */
  async getJobHistory(sourceAdapter?: string, limit = 10): Promise<IngestionJob[]> {
    const query = this.ingestionJobRepo.createQueryBuilder('job');
    if (sourceAdapter) {
      query.where('job.sourceAdapter = :sourceAdapter', { sourceAdapter });
    }
    return query.orderBy('job.runStartedAt', 'DESC').limit(limit).getMany();
  }

  private async guardRunAllowed(sourceAdapter: string): Promise<void> {
    if (this.activeSources.has(sourceAdapter)) {
      throw new ConflictException(`Ingestion already running for source: ${sourceAdapter}`);
    }

    const latest = await this.ingestionJobRepo.findOne({
      where: { sourceAdapter },
      order: { runStartedAt: 'DESC' },
    });
    if (!latest?.runStartedAt) {
      return;
    }
    const minNextRun = new Date(latest.runStartedAt.getTime() + this.minIntervalMinutes * 60 * 1000);
    const now = new Date();
    if (now < minNextRun) {
      const waitMinutes = Math.ceil((minNextRun.getTime() - now.getTime()) / 60000);
      throw new ConflictException(
        `Ingestion throttled for ${sourceAdapter}. Retry in ~${waitMinutes} minute(s).`,
      );
    }
  }

  private toPoint(longitude?: number, latitude?: number): { type: 'Point'; coordinates: [number, number] } | undefined {
    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      return undefined;
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return undefined;
    }
    return {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }

  private async findOsmCandidates(name: string, lon: number, lat: number): Promise<string[]> {
    const query = `
      SELECT id
      FROM pois
      WHERE source = $1
        AND location IS NOT NULL
        AND name ILIKE $2
        AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, 120)
      LIMIT 5
    `;
    const rows = await this.poiRepo.query(query, ['osm_overpass_budapest', `%${name}%`, lon, lat]);
    return rows.map((row: { id: string }) => row.id);
  }
}
