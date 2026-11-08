import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { IngestionService } from "./ingestion.service";
import { DataRetentionService } from "./data-retention.service";
import { SpatialCountyResolver } from "./spatial-county-resolver.service";
import { AdminAuthModule } from "../auth/admin-auth.module";
import { IngestionController } from "./ingestion.controller";
import { IngestionJob } from "./entities/ingestion-job.entity";
import { Event } from "../event/event.entity";
import { POI } from "../poi/poi.entity";
import { County } from "../county/county.entity";
import { IngestionScheduler } from "./ingestion.scheduler";
import { OSMAdapter } from "./adapters/osm.adapter";
import { WikidataAdapter } from "./adapters/wikidata.adapter";
import { FirecrawlTicketAdapter } from "./adapters/firecrawl-ticket.adapter";
import { SettlementModule } from "../settlement/settlement.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([IngestionJob, Event, POI, County]),
    ScheduleModule.forRoot(),
    SettlementModule,
    AdminAuthModule,
  ],
  providers: [
    IngestionService,
    DataRetentionService,
    SpatialCountyResolver,
    IngestionScheduler,
    OSMAdapter,
    WikidataAdapter,
    FirecrawlTicketAdapter,
  ],
  controllers: [IngestionController],
  exports: [IngestionService, DataRetentionService],
})
export class IngestionModule {}
