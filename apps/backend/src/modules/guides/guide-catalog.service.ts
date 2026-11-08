import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AccessIdentity } from "../access/access.service";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=["poi","event"] as const;
@Injectable()
export class GuideCatalogService {
 constructor(private readonly db:DataSource){}
 async search(identity:AccessIdentity,params:{kind?:string;q?:string;lng?:string;lat?:string;radiusKm?:string;limit?:string}) {
  if(identity.role!=="partner")throw new BadRequestException("Partner account required");
  const kind=params.kind||"poi";
  if(!TYPES.includes(kind as typeof TYPES[number]))throw new BadRequestException("Invalid kind");
  const q=(params.q||"").trim();
  if(q.length>100)throw new BadRequestException("Search too long");
  const lng=params.lng===undefined?19.04:Number(params.lng);
  const lat=params.lat===undefined?47.5:Number(params.lat);
  const radius=params.radiusKm===undefined?30:Number(params.radiusKm);
  const limit=params.limit===undefined?40:Number(params.limit);
  if(!Number.isFinite(lng)||lng < -180||lng > 180||!Number.isFinite(lat)||lat < -90||lat > 90||
     !Number.isFinite(radius)||radius<=0||radius>100||!Number.isInteger(limit)||limit<1||limit>60)
   throw new BadRequestException("Invalid map bounds");
  const point="ST_SetSRID(ST_MakePoint($1,$2),4326)::geography";
  const where=`ST_DWithin(location::geography,${point},$3*1000)`;
  const rows=kind==="poi"?
   await this.db.query(
    `SELECT id,name AS title,category,ST_X(location) AS lng,ST_Y(location) AS lat,
      attribution,address FROM pois WHERE ${where} AND name ILIKE $4
      AND source IN ('osm','wikidata','lechner') AND attribution IS NOT NULL
      ORDER BY location::geography <-> ${point} LIMIT $5`,
    [lng,lat,radius,"%"+q.replace(/[\\%_]/g,"\\$&")+"%",limit]):
   await this.db.query(
    `SELECT id,title,category,ST_X(location) AS lng,ST_Y(location) AS lat,
      attribution,venue AS address FROM events WHERE ${where} AND title ILIKE $4
      AND status='active' AND "isTestData"=false AND "startTime">=now()
      AND "licenseType" IN ('cc0','cc-by','ogl')
      ORDER BY location::geography <-> ${point} LIMIT $5`,
    [lng,lat,radius,"%"+q.replace(/[\\%_]/g,"\\$&")+"%",limit]);
  return {items:rows.map((r:any)=>({id:r.id,kind,title:r.title,category:r.category,
    coordinates:[Number(r.lng),Number(r.lat)],attribution:r.attribution,address:r.address}))};
 }
}
