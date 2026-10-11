import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Settlement } from './settlement.entity';

/**
 * Settlement service for resolving city/town names to county IDs.
 * Used by ingestion module to map event/POI locations to administrative units.
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private settlementsCache: Map<string, string> = new Map(); // name → countyId

  constructor(
    @InjectRepository(Settlement)
    private settlementRepo: Repository<Settlement>,
  ) {}

  /**
   * Resolve a settlement name to a county ID.
   * Falls back to fuzzy matching if exact match not found.
   */
  async resolveCountyId(settlementName: string): Promise<string | null> {
    // Check cache first
    if (this.settlementsCache.has(settlementName)) {
      return this.settlementsCache.get(settlementName) || null;
    }

    // Exact match
    const exact = await this.settlementRepo.findOne({
      where: { name: settlementName },
      select: ['countyId'],
    });

    if (exact) {
      this.settlementsCache.set(settlementName, exact.countyId);
      return exact.countyId;
    }

    // Fuzzy fallback: case-insensitive, substring match
    const fuzzy = await this.settlementRepo.findOne({
      where: { name: Like(`%${settlementName}%`) },
      select: ['countyId'],
    });

    if (fuzzy) {
      this.logger.warn(`Fuzzy settlement match: "${settlementName}" → "${fuzzy.countyId}"`);
      this.settlementsCache.set(settlementName, fuzzy.countyId);
      return fuzzy.countyId;
    }

    this.logger.warn(`Settlement not found: "${settlementName}"`);
    return null;
  }

  /**
   * Get all settlements in a county.
   */
  async getSettlementsByCounty(countyId: string): Promise<Settlement[]> {
    return this.settlementRepo.find({
      where: { countyId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Warm up cache on startup.
   */
  async warmCache(): Promise<void> {
    const settlements = await this.settlementRepo.find({
      select: ['name', 'countyId'],
    });

    for (const s of settlements) {
      this.settlementsCache.set(s.name, s.countyId);
    }

    this.logger.log(`Cache warmed: ${settlements.length} settlements loaded`);
  }

  /**
   * Clear cache (useful for testing).
   */
  clearCache(): void {
    this.settlementsCache.clear();
  }
}
