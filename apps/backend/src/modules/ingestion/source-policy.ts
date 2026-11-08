/**
 * Conservative source registry. Approval requires an independent, documented review.
 * This registry does not itself grant a licence to scrape or republish data.
 */
export interface SourcePolicy {
 id:string;
 approved:boolean;
 dataLicence:string;
 permittedUses:string[];
 requiresAttribution:boolean;
 reviewNotes:string;
}
export const SOURCE_POLICIES:Readonly<Record<string,SourcePolicy>>={
 osm_overpass:{id:'osm_overpass',approved:false,dataLicence:'ODbL-1.0',permittedUses:[],requiresAttribution:true,reviewNotes:'Assess ODbL obligations, endpoint fair-use and extract-based import. No bulk Overpass ingestion until reviewed.'},
 firecrawl_ticket:{id:'firecrawl_ticket',approved:false,dataLicence:'Source-specific reviewed permission required',permittedUses:[],requiresAttribution:true,reviewNotes:'Ticketing sites require source-specific legal and contractual approval before any scraping or republication. Default blocked.'},
 wikidata:{id:'wikidata',approved:false,dataLicence:'CC0 structured data only',permittedUses:[],requiresAttribution:false,reviewNotes:'Confirm geographic query, WDQS usage limits, User-Agent contact and image/text licences separately.'},
};
export function assertSourceApproved(source:string):void{
 const policy=SOURCE_POLICIES[source];
 if(!policy?.approved)throw new Error('Source not approved for automated ingestion: '+source);
}
