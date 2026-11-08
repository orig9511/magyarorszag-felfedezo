import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { AccessIdentity } from "../access/access.service";
import { PublicGuideConfig, validateGuideConfig } from "./guide-config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class PartnerGuidesService {
 constructor(private readonly db:DataSource) {}
 private checkId(id:string) {if(!UUID.test(id)) throw new BadRequestException("Invalid ID");}
 private parse(input:unknown):PublicGuideConfig {
  try {
   const config=validateGuideConfig(input);
   if(config.published) throw new Error("Partner publishing is not enabled");
   return config;
  }catch(e){throw new BadRequestException(e instanceof Error?e.message:"Invalid guide");}
 }
 private async membership(manager:EntityManager,identity:AccessIdentity,organizationId:string) {
  const rows:{role:string}[]=await manager.query(
   `SELECT role FROM momap_organization_memberships WHERE organization_id=$1 AND auth_subject=$2 AND role IN ('owner','editor')`,
   [organizationId,identity.id]);
  if(!rows[0]) throw new ForbiddenException("No editing permission for this organization");
 }
 private async syncLinks(manager:EntityManager,id:string,config:PublicGuideConfig) {
  for(const [table,column,ids] of [
   ["momap_guide_pois","poi_id",config.poiIds],
   ["momap_guide_events","event_id",config.eventIds],
  ] as const) {
   await manager.query(`DELETE FROM ${table} WHERE guide_id=$1`,[id]);
   for(const [index,ref] of ids.entries()) await manager.query(
    `INSERT INTO ${table}(guide_id,${column},sort_order) VALUES($1,$2,$3)`,[id,ref,index]);
  }
 }
 async create(identity:AccessIdentity,input:unknown) {
  const config=this.parse(input);
  try{
   return await this.db.transaction(async manager=>{
    await this.membership(manager,identity,config.organizationId);
    const rows:{id:string}[]=await manager.query(
     `INSERT INTO momap_guides(organization_id,slug,title,accent_color,logo_url,center_lng,center_lat,zoom,categories,published)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,false) RETURNING id`,
     [config.organizationId,config.slug,config.branding.title,config.branding.accentColor,
      config.branding.logoUrl??null,config.map.center[0],config.map.center[1],config.map.zoom,JSON.stringify(config.categories)]);
    await this.syncLinks(manager,rows[0].id,config);
    return {id:rows[0].id};
   });
  }catch(e){if(this.isDuplicate(e))throw new ConflictException("Slug already in use");throw e;}
 }
 async update(identity:AccessIdentity,id:string,input:unknown) {
  this.checkId(id);
  const config=this.parse(input);
  try {
   return await this.db.transaction(async manager=>{
    const rows:{organization_id:string;published:boolean}[]=await manager.query(
     "SELECT organization_id,published FROM momap_guides WHERE id=$1 FOR UPDATE",[id]);
    if(!rows[0])throw new NotFoundException("Guide not found");
    if(rows[0].organization_id!==config.organizationId)throw new ForbiddenException("Organization cannot be changed");
    if(rows[0].published)throw new ForbiddenException("Published guide is locked");
    await this.membership(manager,identity,config.organizationId);
    await manager.query(
     `UPDATE momap_guides SET slug=$2,title=$3,accent_color=$4,logo_url=$5,
      center_lng=$6,center_lat=$7,zoom=$8,categories=$9::jsonb,updated_at=now() WHERE id=$1`,
     [id,config.slug,config.branding.title,config.branding.accentColor,config.branding.logoUrl??null,
      config.map.center[0],config.map.center[1],config.map.zoom,JSON.stringify(config.categories)]);
    await this.syncLinks(manager,id,config);
    return {id};
   });
  }catch(e){if(this.isDuplicate(e))throw new ConflictException("Slug already in use");throw e;}
 }
 async get(identity:AccessIdentity,id:string) {
  this.checkId(id);
  const rows:any[]=await this.db.query(
   `SELECT g.id,g.organization_id,g.slug,g.title,g.accent_color,g.logo_url,
     g.center_lng,g.center_lat,g.zoom,g.categories,g.published
     FROM momap_guides g JOIN momap_organization_memberships m ON m.organization_id=g.organization_id
     WHERE g.id=$1 AND m.auth_subject=$2`,[id,identity.id]);
  if(!rows[0])throw new NotFoundException("Guide not found");
  const g=rows[0];
  const [pois,events]=await Promise.all([
   this.db.query("SELECT poi_id FROM momap_guide_pois WHERE guide_id=$1 ORDER BY sort_order,poi_id",[id]),
   this.db.query("SELECT event_id FROM momap_guide_events WHERE guide_id=$1 ORDER BY sort_order,event_id",[id]),
  ]);
  return validateGuideConfig({
   slug:g.slug,organizationId:g.organization_id,
   branding:{title:g.title,accentColor:g.accent_color,...(g.logo_url?{logoUrl:g.logo_url}:{})},
   map:{center:[Number(g.center_lng),Number(g.center_lat)],zoom:Number(g.zoom)},
   categories:g.categories,poiIds:pois.map((p:any)=>p.poi_id),eventIds:events.map((e:any)=>e.event_id),
   published:g.published,
  });
 }
 private isDuplicate(e:unknown):boolean{return !!e&&typeof e==="object"&&"code" in e&&e.code==="23505";}
}
