const {test}=require('node:test');
const assert=require('node:assert/strict');
const {GuideContentService}=require('../dist/modules/guides/guide-content.service.js');
test('unpublished slug cannot expose curated places',async()=>{
 const db={query:async sql=>sql.includes('FROM momap_guides WHERE slug=')?[]:Promise.reject(Error('Unexpected SQL'))};
 await assert.rejects(new GuideContentService(db).publishedPlaces('draft-guide'),e=>e.status===404);
});
test('invalid slug rejected before SQL',async()=>{
 const db={query:async()=>{throw Error('Unexpected SQL')}};
 await assert.rejects(new GuideContentService(db).publishedPlaces('../secret'),e=>e.status===400);
});
test('curated content returns only valid coordinates and public projection',async()=>{
 const db={query:async sql=>{
  if(sql.includes('FROM momap_guides WHERE slug='))return [{id:'11111111-1111-4111-8111-111111111111'}];
  if(sql.includes('FROM momap_guide_pois'))return [{id:'p',title:'Castle',description:null,category:'attraction',lng:19,lat:47,address:'Budapest',attribution:'OSM',image_url:null},{id:'bad',title:'Bad',description:null,category:'attraction',lng:'NaN',lat:47}];
  return [];
 }};
 const result=await new GuideContentService(db).publishedPlaces('hotel');
 assert.equal(result.places.length,1);
 assert.equal(result.places[0].title,'Castle');
 assert.equal(result.places[0].kind,'poi');
 assert.equal('organizationId' in result.places[0],false);
});
