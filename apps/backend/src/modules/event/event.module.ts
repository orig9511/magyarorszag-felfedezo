import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { Event } from './event.entity';
import { SettlementModule } from '../settlement/settlement.module';
import { EventImportService } from './event-import.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), SettlementModule],
  providers: [EventService, EventImportService],
  controllers: [EventController],
  exports: [EventService, EventImportService],
})
export class EventModule {}
