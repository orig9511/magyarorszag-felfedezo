import { createHash } from 'crypto';
import { RawEventData } from './interfaces/data-adapter.interface';

type Dict=Record<string,unknown>;
const obj=(v:unknown):v is Dict=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=(v:unknown):string|undefined=>typeof v==='string'&&v.trim()?v.trim():undefined;
function nodes(value:unknown,depth=0):Dict[]{
 if(depth>8)return [];
 if(Array.isArray(value))return value.flatMap(v=>nodes(v,depth+1));
 if(!obj(value))return [];
 return [value,...nodes(value['@graph'],depth+1)];
}
function isEvent(v:Dict):boolean{
 const type=v['@type'];
 return (Array.isArray(type)?type:[type]).some(t=>typeof t==='string'&&/^(?:https?:\/\/schema.org\/)?(?:[A-Za-z]*Event)$/.test(t));
}
function extractVenue(value:unknown):{name?:string;settlement?:string;latitude?:number;longitude?:number}{
 if(!obj(value))return {};
 const address=obj(value.address)?value.address:{};
 const geo=obj(value.geo)?value.geo:{};
 const lat=typeof geo.latitude==='number'?geo.latitude:typeof geo.latitude==='string'?Number(geo.latitude):NaN;
 const lon=typeof geo.longitude==='number'?geo.longitude:typeof geo.longitude==='string'?Number(geo.longitude):NaN;
 return {
  name:str(value.name),settlement:str(address.addressLocality),
  latitude:Number.isFinite(lat)&&lat>=-90&&lat<=90?lat:undefined,
  longitude:Number.isFinite(lon)&&lon>=-180&&lon<=180?lon:undefined,
 };
}
/** Parse only structured schema.org Event data; never infer dates from page prose. */
export function extractTicketEvents(
 html:string,pageUrl:string,sourceName:string,licence:string,attribution:string,
):RawEventData[]{
 const base=new URL(pageUrl);
 if(base.protocol!=='https:')throw new Error('HTTPS required for ticket source');
 const scripts=html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
 const out:RawEventData[]=[];
 const seen=new Set<string>();
 for(const match of scripts){
  let data:unknown;
  try{data=JSON.parse(match[1]);}catch{continue;}
  for(const item of nodes(data)){
   if(!isEvent(item))continue;
   const title=str(item.name),date=str(item.startDate);
   const venue=extractVenue(item.location);
   // Explicit zone/offset and clock time are mandatory to avoid local-date drift.
   if(!title||title.length<5||!date||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/i.test(date)||
      !venue.name||!venue.settlement)continue;
   const startTime=new Date(date);
   if(!Number.isFinite(startTime.getTime()))continue;
   const end=str(item.endDate);
   if(end&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/i.test(end))continue;
   const endTime=end?new Date(end):undefined;
   if(endTime&&!Number.isFinite(endTime.getTime()))continue;
   if(endTime&&endTime.getTime()<startTime.getTime())continue;
   const url=str(item.url);
   let canonical=base.href;
   if(url){
    try{const candidate=new URL(url,base);if(candidate.protocol==='https:'&&candidate.hostname===base.hostname) canonical=candidate.href;}catch{}
   }
   const normalizedUrl=new URL(canonical);
   for(const key of [...normalizedUrl.searchParams.keys()]){
    if(/^utm_|^(?:fbclid|gclid|affiliate_code)$/i.test(key))normalizedUrl.searchParams.delete(key);
   }
   normalizedUrl.hash='';
   canonical=normalizedUrl.href;
   const stable=createHash('sha256').update(canonical+'|'+startTime.toISOString()).digest('hex').slice(0,40);
   if(seen.has(stable))continue;
   seen.add(stable);
   out.push({externalId:stable,title,venue:venue.name,settlement:venue.settlement,
    latitude:venue.latitude,longitude:venue.longitude,
    startTime,endTime,sourceUrl:canonical,officialEventUrl:canonical,
    licenseType:licence,attribution,sourceName,
    status:'draft',
   });
  }
 }
 return out;
}
