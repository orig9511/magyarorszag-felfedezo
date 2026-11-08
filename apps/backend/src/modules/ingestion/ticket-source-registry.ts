/**
 * Ticket-site discovery is a research lead, not a licence to scrape or republish.
 * Two explicit independent approvals are needed for extraction and discovery.
 */
export interface TicketSource {
 id:string;
 name:string;
 domain:string;
 approved:boolean;
 reviewedAt?:string;
 licence?:string;
 allowedPaths:readonly string[];
 seedUrls:readonly string[];
 discovery?:{indexUrl:string;search:string;approved:boolean;maxUrls:number};
}
export const TICKET_SOURCES:Readonly<Record<string,TicketSource>>={
 jegyhu:{id:'jegyhu',name:'Jegy.hu',domain:'www.jegy.hu',approved:false,
  allowedPaths:['/program/'],seedUrls:[],
  discovery:{indexUrl:'https://www.jegy.hu/',search:'program',approved:false,maxUrls:30}},
 cooltix:{id:'cooltix',name:'Cooltix',domain:'cooltix.hu',approved:false,
  allowedPaths:['/event/'],seedUrls:[],
  discovery:{indexUrl:'https://cooltix.hu/',search:'event',approved:false,maxUrls:30}},
 eventim:{id:'eventim',name:'Eventim',domain:'www.eventim.hu',approved:false,
  allowedPaths:['/'],seedUrls:[],
  discovery:{indexUrl:'https://www.eventim.hu/',search:'event',approved:false,maxUrls:30}},
};
export function isTicketSourceUrl(value:string,source:TicketSource):boolean{
 try{
  const url=new URL(value);
  return url.protocol==='https:' && url.hostname===source.domain &&
   !url.port && !url.username && !url.password && url.hash==='' &&
   source.allowedPaths.some(prefix=>url.pathname.startsWith(prefix));
 }catch{return false;}
}
export function approvedTicketSource(id:string):TicketSource{
 const source=TICKET_SOURCES[id];
 if(!source?.approved||!source.reviewedAt||!source.licence)
  throw new Error('Ticket event source not approved: '+id);
 if(source.seedUrls.length>20 || source.seedUrls.some(url=>!isTicketSourceUrl(url,source)))
  throw new Error('Ticket source seed URL not on exact approved allowlist');
 const discovery=source.discovery;
 if(discovery?.approved){
  const index=new URL(discovery.indexUrl);
  if(index.protocol!=='https:'||index.hostname!==source.domain||
     index.port||index.username||index.password||index.hash||
     !discovery.search || !Number.isInteger(discovery.maxUrls)||
     discovery.maxUrls<1||discovery.maxUrls>100)
    throw new Error('Ticket discovery configuration is invalid');
 }
 if(!source.seedUrls.length&&!discovery?.approved)
  throw new Error('Ticket source needs reviewed URLs or an approved discovery scope');
 return source;
}
