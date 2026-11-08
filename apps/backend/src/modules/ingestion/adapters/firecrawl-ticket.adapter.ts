import { Injectable } from '@nestjs/common';
import { DataAdapter,RawEventData } from '../interfaces/data-adapter.interface';
import { approvedTicketSource,TICKET_SOURCES } from '../ticket-source-registry';
import { extractTicketEvents } from '../ticket-jsonld';

/**
 * Review-only ingestion candidate adapter.
 * Does not invoke arbitrary URLs, discover unreviewed pages, or publish directly.
 * API calls consume Firecrawl credits; no automatic scheduler is registered.
 */
@Injectable()
export class FirecrawlTicketAdapter implements DataAdapter {
 readonly name='firecrawl_ticket';
 readonly type='events' as const;
 async fetchData():Promise<RawEventData[]>{
  if(process.env.MOMAP_TICKET_SCRAPE_ENABLED!=='true')throw new Error('Ticket scrape disabled');
  const key=process.env.FIRECRAWL_API_KEY;
  if(!key)throw new Error('Missing server-side FIRECRAWL_API_KEY');
  const id=process.env.MOMAP_TICKET_SOURCE_ID||'';
  const source=approvedTicketSource(id);
  const events:RawEventData[]=[];
  for(const url of source.seedUrls){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),20000);
   try{
    const response=await fetch('https://api.firecrawl.dev/v2/scrape',{
      method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
      body:JSON.stringify({url,formats:['html'],onlyMainContent:false}),
    });
    if(!response.ok)throw new Error('Firecrawl HTTP '+response.status);
    const payload:unknown=await response.json();
    if(!payload||typeof payload!=='object')throw new Error('Invalid Firecrawl payload');
    const res=payload as {success?:boolean;data?:{html?:unknown}};
    if(!res.success||typeof res.data?.html!=='string')throw new Error('Firecrawl did not return HTML');
    events.push(...extractTicketEvents(res.data.html,url,source.name,source.licence!,source.name));
   }finally{clearTimeout(timer);}
  }
  // Preserve occurrences, dedupe identical URL+date fingerprints within this batch.
  return [...new Map(events.map(e=>[e.externalId,e])).values()];
 }
 validateRecord(record:RawEventData){
  const errors:string[]=[];
  if(!record.externalId)errors.push('source ID missing');
  if(!record.title||record.title.length<5)errors.push('invalid event title');
  if(!record.venue||!record.settlement)errors.push('venue and locality required');
  if(!(record.startTime instanceof Date)||!Number.isFinite(record.startTime.getTime()))errors.push('invalid date');
  if(!record.sourceUrl||!record.licenceType){} // placeholder
  return {valid:errors.length===0,errors};
 }
}
