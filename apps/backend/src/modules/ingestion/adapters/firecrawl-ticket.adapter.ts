import { Injectable, Logger } from '@nestjs/common';
import { DataAdapter, RawEventData } from '../interfaces/data-adapter.interface';
import { approvedTicketSource, isTicketSourceUrl, TicketSource } from '../ticket-source-registry';
import { extractTicketEvents } from '../ticket-jsonld';

interface MapResponse{
 success?:boolean;
 links?:Array<string|{url:string}>;
 data?:{links?:Array<string|{url:string}>};
}
interface ScrapeResponse{
 success?:boolean;
 data?:{html?:unknown};
}
/**
 * Source-approved, bounded Firecrawl event collection with structured-data extraction.
 * NO scheduled scraping, arbitrary target URLs, or automatic public publication.
 * This integration is disabled until source-specific legal review and operator opt-in.
 */
@Injectable()
export class FirecrawlTicketAdapter implements DataAdapter {
 readonly name='firecrawl_ticket';
 readonly type='events' as const;
 private readonly logger=new Logger(FirecrawlTicketAdapter.name);
 private readonly maxPages=20;

 private async post<T>(path:'/scrape'|'/map',key:string,body:unknown):Promise<T>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch('https://api.firecrawl.dev/v2'+path,{
    method:'POST',signal:controller.signal,
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
    body:JSON.stringify(body),
   });
   if(!response.ok)throw new Error('Firecrawl '+path+' HTTP '+response.status);
   const payload:unknown=await response.json();
   if(!payload||typeof payload!=='object')throw new Error('Invalid Firecrawl '+path+' response');
   return payload as T;
  }finally{clearTimeout(timer);}
 }

 private async discover(source:TicketSource,key:string):Promise<string[]>{
  const config=source.discovery;
  if(!config?.approved || process.env.MOMAP_TICKET_DISCOVERY_ENABLED!=='true')return [];
  const response=await this.post<MapResponse>('/map',key,{
   url:config.indexUrl,search:config.search,limit:Math.min(config.maxUrls*3,100),
   ignoreQueryParameters:true,sitemap:'include',
  });
  if(!response.success)throw new Error('Firecrawl URL discovery failed');
  const links=response.links||response.data?.links||[];
  const urls=links.map(item=>typeof item==='string'?item:item.url)
   .filter(url=>isTicketSourceUrl(url,source));
  return [...new Set(urls)].slice(0,config.maxUrls);
 }

 async fetchData():Promise<RawEventData[]>{
  if(process.env.MOMAP_TICKET_SCRAPE_ENABLED!=='true')
   throw new Error('Ticket scrape disabled');
  const source=approvedTicketSource(process.env.MOMAP_TICKET_SOURCE_ID||'');
  const key=process.env.FIRECRAWL_API_KEY;
  if(!key)throw new Error('Missing server-side FIRECRAWL_API_KEY');
  const discovered=await this.discover(source,key);
  const urls=[...new Set([...source.seedUrls,...discovered])]
   .filter(url=>isTicketSourceUrl(url,source)).slice(0,this.maxPages);
  if(!urls.length)throw new Error('No approved ticket URLs selected');
  const events:RawEventData[]=[];
  for(const [index,url] of urls.entries()){
   const response=await this.post<ScrapeResponse>('/scrape',key,{
    url,formats:['html'],onlyMainContent:false,
   });
   if(!response.success||typeof response.data?.html!=='string')
    throw new Error('Firecrawl page did not return HTML');
   const rows=extractTicketEvents(response.data.html,url,source.name,source.licence!,source.name);
   events.push(...rows);
   if(index+1<urls.length)await new Promise<void>(resolve=>setTimeout(resolve,750));
  }
  this.logger.log('Collected '+events.length+' candidate event occurrences from '+urls.length+' reviewed-domain pages');
  return [...new Map(events.map(e=>[e.externalId,e])).values()];
 }

 validateRecord(record:RawEventData){
  const errors:string[]=[];
  if(!record.externalId)errors.push('source ID missing');
  if(!record.title||record.title.length<5)errors.push('invalid event title');
  if(!record.venue||!record.settlement)errors.push('venue and locality required');
  if(!(record.startTime instanceof Date)||!Number.isFinite(record.startTime.getTime()))
   errors.push('invalid event start time');
  if(!record.sourceUrl||!record.licenseType||!record.attribution)
   errors.push('source licence and attribution required');
  return {valid:errors.length===0,errors};
 }
}
