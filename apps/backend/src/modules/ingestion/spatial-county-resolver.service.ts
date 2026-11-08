import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { County } from '../county/county.entity';

/**
 * County geometry is authoritative for coordinate-bearing imported records.
 * No fuzzy settlement matching or hard-coded county assumptions.
 */
@Injectable()
export class SpatialCountyResolver {
 constructor(@InjectRepository(County) private readonly counties:Repository<County>){}

 async resolve(longitude:number,latitude:number):Promise<string|null>{
  if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||
     longitude < -180||longitude > 180||latitude < -90||latitude > 90){
   throw new Error('Invalid coordinates for spatial county lookup');
  }
  const matches=await this.counties.query(
   `SELECT id FROM counties
      WHERE active = TRUE
        AND ST_Covers(geometry, ST_SetSRID(ST_MakePoint($1,$2),4326))
      ORDER BY id LIMIT 2`,[longitude,latitude]
  ) as Array<{id:string}>;
  // A border point may be covered by two counties; never silently pick one.
  return matches.length===1?matches[0].id:null;
 }
}
