import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POI } from './poi.entity';
import { POIService } from './poi.service';
import { POIController } from './poi.controller';

@Module({
  imports: [TypeOrmModule.forFeature([POI])],
  providers: [POIService],
  controllers: [POIController],
})
export class POIModule {}
