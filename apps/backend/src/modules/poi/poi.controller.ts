import { Controller, Get, Query, Param } from '@nestjs/common';
import { POIService } from './poi.service';
import { GetPOIsDto } from './dto/get-pois.dto';

@Controller('api/pois')
export class POIController {
  constructor(private poiService: POIService) {}

  @Get('viewport')
  async getPOIsByViewport(@Query() dto: GetPOIsDto) {
    return this.poiService.getPOIsByViewport(dto);
  }

  @Get(':id')
  async getPOIById(@Param('id') id: string) {
    return this.poiService.getPOIById(id);
  }
}
