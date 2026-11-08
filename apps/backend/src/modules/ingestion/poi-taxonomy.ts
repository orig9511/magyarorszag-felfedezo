/** Common Momap categories. Unknown values are not silently promoted to attractions. */
export type MomapPoiCategory =
 'restaurant'|'cafe'|'accommodation'|'attraction'|'museum'|'historic'|'other';
const OSM_CATEGORIES:Readonly<Record<string,MomapPoiCategory>>={
 restaurant:'restaurant',fast_food:'restaurant',bar:'restaurant',pub:'restaurant',
 cafe:'cafe',hotel:'accommodation',hostel:'accommodation',
 guest_house:'accommodation',attraction:'attraction',museum:'museum',
 monument:'historic',castle:'historic',ruins:'historic',
 archaeological_site:'historic',
};
export function normalizeOsmCategory(tags:Record<string,string>):MomapPoiCategory|null {
 for(const key of ['tourism','amenity','historic']){
  const value=tags[key];
  if(value && OSM_CATEGORIES[value])return OSM_CATEGORIES[value];
 }
 return null;
}
export function normalizeWikidataCategory():MomapPoiCategory {
 return 'attraction'; // Only after independently validating the query's instance-of constraints.
}
