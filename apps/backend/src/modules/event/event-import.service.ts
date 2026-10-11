import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse as parseCsv } from 'csv-parse/sync';
import { DateTime } from 'luxon';
import { readFile } from 'node:fs/promises';
import { Repository } from 'typeorm';
import { SettlementService } from '../settlement/settlement.service';
import { Event } from './event.entity';

export type EventImportFormat = 'json' | 'csv';

export type EventImportOptions = {
  filePath: string;
  format: EventImportFormat;
  source: string;
  dryRun?: boolean;
  allowTestData?: boolean;
};

export type EventImportSummary = {
  source: string;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs: number;
  errors: string[];
};

type InputRecord = {
  externalId?: string;
  title?: string;
  description?: string;
  category?: string;
  eventType?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  venue?: string;
  settlement?: string;
  latitude?: string | number;
  longitude?: string | number;
  performers?: string | string[];
  officialEventUrl?: string;
  ticketUrl?: string;
  status?: string;
  isTestData?: boolean | string;
};

@Injectable()
export class EventImportService {
  private readonly categoryMap: Record<string, string> = {
    concert: 'concert',
    music: 'concert',
    festival: 'festival',
    party: 'party',
    dj: 'party',
    cultural: 'cultural',
    theatre: 'cultural',
    theater: 'cultural',
  };

  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly settlementService: SettlementService,
  ) {}

  async importFromFile(options: EventImportOptions): Promise<EventImportSummary> {
    const started = Date.now();
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const content = await readFile(options.filePath, 'utf8');
    const records = this.parseRecords(content, options.format);

    for (const [index, input] of records.entries()) {
      const rowId = input.externalId || `row-${index + 1}`;
      try {
        const normalized = await this.normalizeRecord(input, options.allowTestData === true);
        if (!normalized) {
          skipped++;
          continue;
        }
        if (normalized.isTestData && options.allowTestData !== true) {
          skipped++;
          errors.push(`${rowId}: test adat kihagyva (--allow-test-data nélkül).`);
          continue;
        }

        const existing = await this.eventRepo.findOne({
          where: {
            source: options.source,
            sourceId: normalized.externalId,
          },
        });

        if (existing) {
          if (!options.dryRun) {
            await this.eventRepo.update(existing.id, this.toEventPartial(normalized, existing.countyId, options.source));
          }
          updated++;
        } else {
          const countyId = await this.settlementService.resolveCountyId(normalized.settlement);
          if (!countyId) {
            skipped++;
            errors.push(`${rowId}: ismeretlen település (${normalized.settlement}).`);
            continue;
          }
          if (!options.dryRun) {
            const entity = this.eventRepo.create(this.toEventPartial(normalized, countyId, options.source));
            await this.eventRepo.save(entity);
          }
          created++;
        }
      } catch (error) {
        failed++;
        errors.push(`${rowId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      source: options.source,
      processed: records.length,
      created,
      updated,
      skipped,
      failed,
      durationMs: Date.now() - started,
      errors,
    };
  }

  private parseRecords(content: string, format: EventImportFormat): InputRecord[] {
    if (format === 'json') {
      const parsed = JSON.parse(content) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('A JSON bemenet tömb legyen.');
      }
      return parsed as InputRecord[];
    }
    const parsed = parseCsv(content, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
    });
    return parsed as InputRecord[];
  }

  private async normalizeRecord(input: InputRecord, allowTestData: boolean) {
    if (!input.externalId || !input.title || !input.startTime || !input.settlement) {
      throw new Error('Kötelező mezők: externalId, title, startTime, settlement.');
    }
    const timezone = input.timezone || 'Europe/Budapest';
    const start = this.parseDate(input.startTime, timezone);
    if (!start) {
      throw new Error(`Érvénytelen startTime: ${input.startTime}`);
    }
    const end = input.endTime ? this.parseDate(input.endTime, timezone) : undefined;

    return {
      externalId: input.externalId,
      title: input.title.trim(),
      description: input.description?.trim(),
      category: this.normalizeCategory(input.category),
      eventType: input.eventType?.trim(),
      startTime: start.toJSDate(),
      endTime: end?.toJSDate(),
      timezone,
      venue: input.venue?.trim(),
      settlement: input.settlement.trim(),
      latitude: this.toNumber(input.latitude),
      longitude: this.toNumber(input.longitude),
      performers: this.normalizePerformers(input.performers),
      officialEventUrl: input.officialEventUrl?.trim(),
      ticketUrl: input.ticketUrl?.trim(),
      status: this.normalizeStatus(input.status),
      isTestData: allowTestData && this.toBoolean(input.isTestData),
    };
  }

  private toEventPartial(
    normalized: {
      externalId: string;
      title: string;
      description?: string;
      category: string;
      eventType?: string;
      startTime: Date;
      endTime?: Date;
      timezone: string;
      venue?: string;
      settlement: string;
      latitude?: number;
      longitude?: number;
      performers?: string[];
      officialEventUrl?: string;
      ticketUrl?: string;
      status: 'active' | 'cancelled' | 'postponed' | 'draft';
      isTestData: boolean;
    },
    countyId: string,
    source: string,
  ): Partial<Event> {
    return {
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      eventType: normalized.eventType,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      timezone: normalized.timezone,
      venue: normalized.venue,
      location: this.toPoint(normalized.longitude, normalized.latitude),
      countyId,
      settlement: normalized.settlement,
      performers: normalized.performers?.join(', '),
      sourceUrl: normalized.officialEventUrl,
      officialEventUrl: normalized.officialEventUrl,
      ticketUrl: normalized.ticketUrl,
      source,
      sourceId: normalized.externalId,
      status: normalized.status,
      retrievedAt: new Date(),
      lastCheckedAt: new Date(),
      isTestData: normalized.isTestData,
    };
  }

  private normalizeCategory(category?: string): string {
    if (!category) return 'other';
    const key = category.toLowerCase().trim();
    return this.categoryMap[key] || key;
  }

  private normalizeStatus(status?: string): 'active' | 'cancelled' | 'postponed' | 'draft' {
    if (!status) return 'active';
    const normalized = status.toLowerCase();
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    if (normalized === 'postponed' || normalized === 'rescheduled') return 'postponed';
    if (normalized === 'draft') return 'draft';
    return 'active';
  }

  private parseDate(value: string, timezone: string): DateTime | null {
    const asIso = DateTime.fromISO(value, { zone: timezone });
    if (asIso.isValid) return asIso;
    const asSql = DateTime.fromSQL(value, { zone: timezone });
    if (asSql.isValid) return asSql;
    return null;
  }

  private normalizePerformers(value?: string | string[]): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }
    return value
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'igen'].includes(value.toLowerCase().trim());
    }
    return false;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
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
}
