/**
 * Discovery does not imply permission to harvest or republish event data.
 * Production onboarding requires written rights/terms review per source.
 */
export interface TicketSource {
 id:string; name:string; domain:string;
 approved:boolean; reviewedAt?:string; licence?:string;
 allowedPaths:readonly string[]; seedUrls:readonly string[];
}
export const TICKET_SOURCES:Readonly<Record<string,TicketSource>>={
 'jegyhu':{id:'jegyhu',name:'Jegy.hu',domain:'www.jegy.hu',approved:false,allowedPaths:['/program/'],seedUrls:[]},
 'cooltix':{id:'cooltix',name:'Cooltix',domain:'cooltix.hu',approved:false,allowedPaths:['/event/'],seedUrls:[]},
 'eventim':{id:'eventim',name:'Eventim',domain:'www.eventim.hu',approved:false,allowedPaths:['/'],seedUrls:[]},
};
export function approvedTicketSource(id:string):TicketSource {
 const source=TICKET_SOURCES[id];
 if(!source?.approved||!source.reviewedAt||!source.licence)
  throw new Error('Ticket event source not approved: '+id);
 if(!source.seedUrls.length||source.seedUrls.length>20)
  throw new Error('Ticket source needs 1–20 reviewed seed URLs');
 for(const value of source.seedUrls){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!==source.domain||
      !source.allowedPaths.some(prefix=>url.pathname.startsWith(prefix))||
      url.username||url.password||url.port)
    throw new Error('Ticket source seed URL not on exact approved allowlist');
 }
 return source;
}
