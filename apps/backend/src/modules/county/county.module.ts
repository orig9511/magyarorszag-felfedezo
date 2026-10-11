import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { County } from './county.entity';
import { CountyService } from './county.service';
import { CountyController } from './county.controller';

@Module({
  imports: [TypeOrmModule.forFeature([County])],
  providers: [CountyService],
  controllers: [CountyController],
})
export class CountyModule {}
