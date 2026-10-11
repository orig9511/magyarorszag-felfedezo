import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { POI } from './poi.entity';
import { GetPOIsDto } from './dto/get-pois.dto';

@Injectable()
export class POIService {
  constructor(
    @InjectRepository(POI)
    private poiRepository: Repository<POI>,
  ) {}

  async getPOIsByViewport(dto: GetPOIsDto): Promise<POI[]> {
    const query = this.poiRepository
      .createQueryBuilder('poi')
      .where(
        `ST_Intersects(
          poi.location,
          ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)
        )`,
        {
          minLat: dto.minLat,
          maxLat: dto.maxLat,
          minLng: dto.minLng,
          maxLng: dto.maxLng,
        },
      );

    const categories = dto.categories
      ? dto.categories
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    if (categories.length > 0) {
      query.andWhere('poi.category IN (:...categories)', { categories });
    }

    if (dto.countyId) {
      query.andWhere('poi.countyId = :countyId', { countyId: dto.countyId });
    }

    return query.limit(1000).getMany();
  }

  async getPOIById(id: string): Promise<POI | null> {
    return this.poiRepository.findOne({ where: { id } });
  }
}
