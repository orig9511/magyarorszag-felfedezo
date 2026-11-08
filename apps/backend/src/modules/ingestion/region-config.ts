/** Pilot scopes are explicit; never infer a county from a bounding box. */
export interface IngestionRegion {
  id: string;
  settlement: string;
  bbox: readonly [number,number,number,number]; // south,west,north,east
}
export const INGESTION_REGIONS: Readonly<Record<string,IngestionRegion>> = {
  'debrecen-pilot': {
    id:'debrecen-pilot',settlement:'Debrecen',
    bbox:[47.5,21.6,47.55,21.7],
  },
};
export function selectedIngestionRegion():IngestionRegion {
  const id=process.env.MOMAP_INGESTION_REGION || 'debrecen-pilot';
  const region=INGESTION_REGIONS[id];
  if(!region)throw new Error('Unreviewed ingestion region: '+id);
  const [south,west,north,east]=region.bbox;
  if(![south,west,north,east].every(Number.isFinite) ||
     south>=north || west>=east || south < -90 || north>90 || west < -180 || east>180) {
    throw new Error('Invalid ingestion region bounds');
  }
  return region;
}
export function withinRegion(lat:number,lon:number,region:IngestionRegion):boolean {
  const [south,west,north,east]=region.bbox;
  return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=south&&lat<=north&&lon>=west&&lon<=east;
}
