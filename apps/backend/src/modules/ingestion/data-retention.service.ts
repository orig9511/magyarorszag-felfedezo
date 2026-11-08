import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../event/event.entity';
import { POI } from '../poi/poi.entity';

/**
 * Explicit opt-in maintenance. Preview is read-only; actual deletion is bounded.
 * Never delete editorial or partner-owned records based on automated heuristics.
 */
@Injectable()
export class DataRetentionService {
 private readonly logger=new Logger(DataRetentionService.name);
 private readonly batchSize=100;
 constructor(
  @InjectRepository(Event) private readonly events:Repository<Event>,
  @InjectRepository(POI) private readonly pois:Repository<POI>,
 ){}
 async preview(){
  const [expired,invalidEvents,invalidPois]=await Promise.all([
   this.events.query(`SELECT count(*)::int AS count FROM events WHERE source IN ('osm_overpass','wikidata') AND "ownerId" IS NULL AND COALESCE("endTime","startTime") < (NOW() AT TIME ZONE 'Europe/Budapest') - INTERVAL '30 days'`),
   this.events.query(`SELECT count(*)::int AS count FROM events WHERE source IN ('osm_overpass','wikidata') AND "ownerId" IS NULL AND (trim(title)='' OR "startTime" IS NULL OR "sourceUrl" IS NULL OR "attribution" IS NULL)`),
   this.pois.query(`SELECT count(*)::int AS count FROM pois WHERE source IN ('osm_overpass','wikidata') AND "ownerId" IS NULL AND "moderationStatus"='active' AND (trim(name)='' OR location IS NULL OR "attribution" IS NULL OR "externalRefs" IS NULL)`),
  ]);
  return {expiredEvents:Number(expired[0]?.count||0),invalidEvents:Number(invalidEvents[0]?.count||0),invalidPois:Number(invalidPois[0]?.count||0),deletionEnabled:process.env.MOMAP_RETENTION_DELETE_ENABLED==='true'};
 }
 async prune():Promise<{expiredEvents:number;invalidEvents:number;invalidPois:number}>{
  if(process.env.MOMAP_RETENTION_DELETE_ENABLED!=='true')throw new Error('Data retention deletion is disabled');
  const queries=[
   `DELETE FROM events WHERE id IN (SELECT id FROM events WHERE source IN ('osm_overpass','wikidata') AND "ownerId" IS NULL AND COALESCE("endTime","startTime") < (NOW() AT TIME ZONE 'Europe/Budapest') - INTERVAL '30 days' ORDER BY id LIMIT $1) RETURNING id`,
   `DELETE FROM events WHERE id IN (SELECT id FROM events WHERE source IN ('osm_overpass','wikidata') AND "ownerId" IS NULL AND (trim(title)='' OR "startTime" IS NULL OR "sourceUrl" IS NULL OR "attribution" IS NULL) ORDER BY id LIMIT $1) RETURNING id`,
   `DELETE FROM pois WHERE id IN (SELECT id FROM pois WHERE source IN ('osm_overpass','wikidata') AND "ownerId" IS NULL AND "moderationStatus"='active' AND (trim(name)='' OR location IS NULL OR "attribution" IS NULL OR "externalRefs" IS NULL) ORDER BY id LIMIT $1) RETURNING id`,
  ];
  const counts:number[]=[];
  for(const [index,sql] of queries.entries()){
   const rows=await (index===2?this.pois:this.events).query(sql,[this.batchSize]) as Array<{id:string}>;
   counts.push(rows.length);
  }
  this.logger.warn('Retention batch deleted imported records: '+counts.join(','));
  return {expiredEvents:counts[0],invalidEvents:counts[1],invalidPois:counts[2]};
 }
}
