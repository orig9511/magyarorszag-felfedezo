import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminController } from './admin.controller';
import { IngestionModule } from '../ingestion/ingestion.module';
import { EventModule } from '../event/event.module';

@Module({
  imports: [AdminAuthModule, IngestionModule, EventModule],
  controllers: [AdminController],
})
export class AdminModule {}
