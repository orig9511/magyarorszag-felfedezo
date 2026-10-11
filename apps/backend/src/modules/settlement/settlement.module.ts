import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement } from './settlement.entity';
import { SettlementService } from './settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Settlement])],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule implements OnModuleInit {
  constructor(private settlementService: SettlementService) {}

  async onModuleInit(): Promise<void> {
    // Warm cache on startup for performance
    try {
      await this.settlementService.warmCache();
    } catch (error) {
      console.error('Failed to warm settlement cache:', error);
    }
  }
}
