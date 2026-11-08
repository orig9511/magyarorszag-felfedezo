import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AccessIdentity } from "../access/access.service";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class GuidePublicationService {
 constructor(private readonly db:DataSource){}
 private admin(identity:AccessIdentity) {
  if(identity.role!=="admin"||identity.status!=="active")throw new ForbiddenException("Admin required");
 }
 async list(identity:AccessIdentity) {
  this.admin(identity);
  return this.db.query(
   `SELECT g.id,g.slug,g.title,g.published,g.organization_id AS "organizationId",
      o.name AS organization,o.business_type AS "businessType",
      (SELECT count(*)::integer FROM momap_guide_pois WHERE guide_id=g.id) AS "poiCount",
      (SELECT count(*)::integer FROM momap_guide_events WHERE guide_id=g.id) AS "eventCount"
     FROM momap_guides g JOIN momap_organizations o ON o.id=g.organization_id
     ORDER BY g.updated_at DESC LIMIT 150`);
 }
 async decide(identity:AccessIdentity,id:string,publish:boolean) {
  this.admin(identity);
  if(!UUID.test(id))throw new BadRequestException("Invalid guide ID");
  return this.db.transaction(async manager=>{
   const rows:{id:string;published:boolean;title:string}[]=await manager.query(
    "SELECT id,published,title FROM momap_guides WHERE id=$1 FOR UPDATE",[id]);
   if(!rows[0])throw new NotFoundException("Guide not found");
   if(publish){
    const links:{poi_count:number;event_count:number}[]=await manager.query(
     `SELECT (SELECT count(*)::integer FROM momap_guide_pois gp JOIN pois p ON p.id=gp.poi_id
          WHERE gp.guide_id=$1 AND p.source IN ('osm','wikidata','lechner') AND p.attribution IS NOT NULL) AS poi_count,
       (SELECT count(*)::integer FROM momap_guide_events ge JOIN events e ON e.id=ge.event_id
          WHERE ge.guide_id=$1 AND e.status='active' AND e."isTestData"=false
          AND e."licenseType" IN ('cc0','cc-by','ogl')) AS event_count`,[id]);
    const all:{poi_count:number;event_count:number}[]=await manager.query(
     `SELECT (SELECT count(*)::integer FROM momap_guide_pois WHERE guide_id=$1) AS poi_count,
      (SELECT count(*)::integer FROM momap_guide_events WHERE guide_id=$1) AS event_count`,[id]);
    if(!all[0] || (all[0].poi_count+all[0].event_count)===0)
     throw new BadRequestException("Guide must contain at least one place");
    if(links[0].poi_count!==all[0].poi_count||links[0].event_count!==all[0].event_count)
     throw new BadRequestException("Some linked content is not eligible for publication");
   }
   await manager.query(
    `UPDATE momap_guides SET published=$2,published_at=CASE WHEN $2 THEN now() ELSE NULL END,
      updated_at=now() WHERE id=$1`,[id,publish]);
   return {id,published:publish};
  });
 }
}
