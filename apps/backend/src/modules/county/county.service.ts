import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { County } from './county.entity';

@Injectable()
export class CountyService {
  constructor(
    @InjectRepository(County)
    private countyRepository: Repository<County>,
  ) {}

  /**
   * Overview list: metadata plus the simplified `displayGeometry` (GeoJSON, 5 decimals ~ 1 m);
   * the full-resolution `geometry` is left out. Use getCountyGeometry for detailed views.
   */
  async getAllCounties(): Promise<Omit<County, 'geometry'>[]> {
    return this.countyRepository
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c.name AS name',
        'c."nameEn" AS "nameEn"',
        'c.code AS code',
        'c.active AS active',
        'c.license AS license',
        'c.attribution AS attribution',
        'c.source AS source',
        'c."sourceId" AS "sourceId"',
        'ST_AsGeoJSON(c."displayGeometry", 5)::json AS "displayGeometry"',
      ])
      .orderBy('c.name', 'ASC')
      .getRawMany();
  }

  async getCountyById(id: string): Promise<County | null> {
    return this.countyRepository.findOne({ where: { id } });
  }

  async getCountyGeometry(id: string): Promise<any> {
    const county = await this.countyRepository.findOne({ where: { id } });
    return county ? { id: county.id, geometry: county.geometry } : null;
  }
}
