import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { IngestionModule } from '../ingestion/ingestion.module';
import { EventModule } from '../event/event.module';

@Module({
  imports: [IngestionModule, EventModule],
  controllers: [AdminController],
})
export class AdminModule {}
