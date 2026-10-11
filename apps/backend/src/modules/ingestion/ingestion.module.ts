import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { IngestionJob } from './entities/ingestion-job.entity';
import { Event } from '../event/event.entity';
import { POI } from '../poi/poi.entity';
import { County } from '../county/county.entity';
import { IngestionScheduler } from './ingestion.scheduler';
import { OSMAdapter } from './adapters/osm.adapter';
import { WikidataAdapter } from './adapters/wikidata.adapter';
import { TicketmasterAdapter } from './adapters/ticketmaster.adapter';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngestionJob, Event, POI, County]),
    ScheduleModule.forRoot(),
    SettlementModule,
  ],
  providers: [IngestionService, IngestionScheduler, OSMAdapter, WikidataAdapter, TicketmasterAdapter],
  controllers: [IngestionController],
  exports: [IngestionService],
})
export class IngestionModule {}
