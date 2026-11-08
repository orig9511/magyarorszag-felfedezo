import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";

export interface GuidePlace {
 id:string; kind:"poi"|"event"; title:string; description:string|null;
 category:string; coordinates:[number,number]; address?:string|null;
 attribution?:string|null; imageUrl?:string|null; startTime?:string|null;
}
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
@Injectable()
export class GuideContentService {
 constructor(private readonly db:DataSource){}
 /**
  * Only explicitly curated references from published guides.
  * Event drafts/cancelled/test data excluded. Private/restricted event licenses excluded.
  * POI data currently has no publication/license column: only allow known public sources
  * with attribution; add explicit editorial approval before production publication.
  */
 async publishedPlaces(slug:string):Promise<{places:GuidePlace[]}> {
  if(!SLUG.test(slug)||slug.length>80)throw new BadRequestException("Invalid guide slug");
  const guides:{id:string}[]=await this.db.query(
   "SELECT id FROM momap_guides WHERE slug=$1 AND published=true",[slug]);
  if(!guides[0])throw new NotFoundException("Guide not found");
  const guideId=guides[0].id;
  const pois: Array<{id:string;title:string;description:string|null;category:string;lng:number;lat:number;address:string|null;attribution:string|null;image_url:string|null}>=await this.db.query(
   `SELECT p.id,p.name AS title,p.description,p.category,
       ST_X(p.location) AS lng,ST_Y(p.location) AS lat,
       p.address,p.attribution,p."imageUrl" AS image_url
     FROM momap_guide_pois gp
     JOIN momap_guides g ON g.id=gp.guide_id AND g.published=true
     JOIN pois p ON p.id=gp.poi_id
     WHERE gp.guide_id=$1 AND p.source IN ('osm','wikidata','lechner')
       AND p.location IS NOT NULL AND p.attribution IS NOT NULL
     ORDER BY gp.sort_order,gp.poi_id LIMIT 250`,[guideId]);
  const events:Array<{id:string;title:string;description:string|null;category:string;lng:number;lat:number;attribution:string|null;start_time:string}>=await this.db.query(
   `SELECT e.id,e.title,e.description,e.category,
       ST_X(e.location) AS lng,ST_Y(e.location) AS lat,
       e.attribution,e."startTime" AS start_time
     FROM momap_guide_events ge
     JOIN momap_guides g ON g.id=ge.guide_id AND g.published=true
     JOIN events e ON e.id=ge.event_id
     WHERE ge.guide_id=$1 AND e.status='active' AND e."isTestData"=false
       AND e.location IS NOT NULL AND e."startTime">=now()-interval '1 day'
       AND e."licenseType" IN ('cc0','cc-by','ogl') AND e.attribution IS NOT NULL
     ORDER BY ge.sort_order,ge.event_id LIMIT 250`,[guideId]);
  const places:GuidePlace[]=[
   ...pois.map(p=>({id:p.id,kind:"poi" as const,title:p.title,description:p.description,
    category:p.category,coordinates:[Number(p.lng),Number(p.lat)] as [number,number],
    address:p.address,attribution:p.attribution,imageUrl:p.image_url})),
   ...events.map(e=>({id:e.id,kind:"event" as const,title:e.title,description:e.description,
    category:e.category,coordinates:[Number(e.lng),Number(e.lat)] as [number,number],
    attribution:e.attribution,startTime:e.start_time})),
  ].filter(p=>p.coordinates.every(n=>Number.isFinite(n)));
  return {places};
 }
}
