import { Controller, Get, Param } from '@nestjs/common';
import { CountyService } from './county.service';

@Controller('api/counties')
export class CountyController {
  constructor(private countyService: CountyService) {}

  @Get()
  async getAllCounties() {
    return this.countyService.getAllCounties();
  }

  @Get(':id')
  async getCountyById(@Param('id') id: string) {
    return this.countyService.getCountyById(id);
  }

  @Get(':id/geometry')
  async getCountyGeometry(@Param('id') id: string) {
    return this.countyService.getCountyGeometry(id);
  }
}
