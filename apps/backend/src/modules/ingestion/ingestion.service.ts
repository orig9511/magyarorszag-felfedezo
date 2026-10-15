import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  IngestionJob,
  IngestionJobStatus,
} from "./entities/ingestion-job.entity";
import { Event } from "../event/event.entity";
import { POI } from "../poi/poi.entity";
import { County } from "../county/county.entity";
import { SettlementService } from "../settlement/settlement.service";
import {
  DataAdapter,
  RawEventData,
  RawPOIData,
  IngestionResult,
} from "./interfaces/data-adapter.interface";

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(IngestionJob)
    private ingestionJobRepo: Repository<IngestionJob>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(POI) private poiRepo: Repository<POI>,
    @InjectRepository(County) private countyRepo: Repository<County>,
    private settlementService: SettlementService,
  ) {}

  /**
   * Run a data adapter and ingest its data.
   */
  async ingestData(adapter: DataAdapter): Promise<IngestionResult> {
    const jobRecord = await this.createJobRecord(adapter.name);
    const startedAt = new Date();

    try {
      this.logger.log(`Starting ingestion from ${adapter.name}`);

      const rawData = await adapter.fetchData();
      this.logger.log(`Fetched ${rawData.length} records from ${adapter.name}`);

      let itemsCreated = 0;
      let itemsUpdated = 0;
      let itemsSkipped = 0;
      let itemsFailed = 0;
      const errors: string[] = [];

      for (const record of rawData) {
        try {
          const validation = adapter.validateRecord(record);
          if (!validation.valid) {
            itemsSkipped++;
            this.logger.warn(
              `Validation failed for ${adapter.name}/${record.externalId}: ${validation.errors?.join(", ")}`,
            );
            errors.push(
              `${record.externalId}: ${validation.errors?.join(", ")}`,
            );
            continue;
          }

          if (adapter.type === "events") {
            const result = await this.ingestEvent(
              adapter.name,
              record as RawEventData,
            );
            if (result.created) itemsCreated++;
            else if (result.updated) itemsUpdated++;
            else itemsSkipped++;
          } else if (adapter.type === "pois") {
            const result = await this.ingestPOI(
              adapter.name,
              record as RawPOIData,
            );
            if (result.created) itemsCreated++;
            else if (result.updated) itemsUpdated++;
            else itemsSkipped++;
          }
        } catch (error) {
          itemsFailed++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to ingest record ${record.externalId}: ${errorMsg}`,
          );
          errors.push(`${record.externalId}: ${errorMsg}`);
        }
      }

      const completedAt = new Date();
      await this.updateJobRecord(jobRecord.id, {
        status:
          itemsFailed > 0
            ? IngestionJobStatus.PARTIAL_FAILURE
            : IngestionJobStatus.COMPLETED,
        runCompletedAt: completedAt,
        itemsProcessed: rawData.length,
        itemsCreated,
        itemsUpdated,
        itemsSkipped,
        itemsFailed,
        errorSummary:
          errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : undefined,
      });

      return {
        source: adapter.name,
        itemsProcessed: rawData.length,
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
      category: record.category || "other",
      startTime: record.startTime,
      endTime: record.endTime,
      venue: record.venue,
      countyId,
      settlement: record.settlement,
      performers: record.performers?.join(", "),
      source: sourceAdapter,
      sourceId: record.externalId,
      sourceUrl: record.sourceUrl,
      licenseType: record.licenseType,
      attribution: record.attribution,
      retrievedAt: new Date(),
      status: "active",
    };

    if (existing) {
      // Update existing record (location updated via raw SQL if coordinates available)
      await this.eventRepo.update(existing.id, eventData);
      if (record.latitude && record.longitude) {
        await this.eventRepo.query(
          `UPDATE events SET location = ST_GeomFromText('POINT(? ?)', 4326) WHERE id = ?`,
          [record.longitude, record.latitude, existing.id],
        );
      }
      return { created: false, updated: true };
    } else {
      // Create new record
      const event = this.eventRepo.create(eventData);
      const saved = await this.eventRepo.save(event);
      // Update location via raw SQL
      if (record.latitude && record.longitude) {
        await this.eventRepo.query(
          `UPDATE events SET location = ST_GeomFromText('POINT(? ?)', 4326) WHERE id = ?`,
          [record.longitude, record.latitude, saved.id],
        );
      }
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
      countyId,
      address: record.address,
      phone: record.phone,
      website: record.website,
      source: sourceAdapter,
      sourceId: record.externalId,
    };

    if (existing) {
      await this.poiRepo.update(existing.id, poiData);
      // Update location via raw SQL
      await this.poiRepo.query(
        `UPDATE pois SET location = ST_GeomFromText('POINT(? ?)', 4326) WHERE id = ?`,
        [record.longitude, record.latitude, existing.id],
      );
      return { created: false, updated: true };
    } else {
      // Create new record
      const poi = this.poiRepo.create(poiData);
      const saved = await this.poiRepo.save(poi);
      // Update location via raw SQL
      await this.poiRepo.query(
        `UPDATE pois SET location = ST_GeomFromText('POINT(? ?)', 4326) WHERE id = ?`,
        [record.longitude, record.latitude, saved.id],
      );
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

  private async updateJobRecord(
    jobId: string,
    updates: Partial<IngestionJob>,
  ): Promise<void> {
    await this.ingestionJobRepo.update(jobId, updates);
  }

  /**
   * Get ingestion history.
   */
  async getJobHistory(
    sourceAdapter?: string,
    limit = 10,
  ): Promise<IngestionJob[]> {
    const query = this.ingestionJobRepo.createQueryBuilder("job");
    if (sourceAdapter) {
      query.where("job.sourceAdapter = :sourceAdapter", { sourceAdapter });
    }
    return query.orderBy("job.runStartedAt", "DESC").limit(limit).getMany();
  }
}
