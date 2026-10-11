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

  async getAllCounties(): Promise<County[]> {
    return this.countyRepository.find({ order: { name: 'ASC' } });
  }

  async getCountyById(id: string): Promise<County | null> {
    return this.countyRepository.findOne({ where: { id } });
  }

  async getCountyGeometry(id: string): Promise<any> {
    const county = await this.countyRepository.findOne({ where: { id } });
    return county ? { id: county.id, geometry: county.geometry } : null;
  }
}
