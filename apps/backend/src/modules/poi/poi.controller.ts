import { Controller, Get, Query, Param, Header } from '@nestjs/common';
import { POIService } from './poi.service';
import { GetPOIsDto } from './dto/get-pois.dto';

@Controller('api/pois')
export class POIController {
  constructor(private poiService: POIService) {}

  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  @Get('viewport')
  async getPOIsByViewport(@Query() dto: GetPOIsDto) {
    return this.poiService.getPOIsByViewport(dto);
  }

  @Get(':id')
  async getPOIById(@Param('id') id: string) {
    return this.poiService.getPOIById(id);
  }
}
