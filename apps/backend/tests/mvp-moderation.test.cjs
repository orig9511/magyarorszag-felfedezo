const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {GUARDS_METADATA}=require('@nestjs/common/constants');
const {AccessGuard}=require('../dist/modules/access/access.guard.js');
const {GuideCatalogController}=require('../dist/modules/guides/guide-catalog.controller.js');
const {GuidePublicationController}=require('../dist/modules/guides/guide-publication.controller.js');
const {GuidePublicationService}=require('../dist/modules/guides/guide-publication.service.js');
const {GuideCatalogService}=require('../dist/modules/guides/guide-catalog.service.js');
const partner={id:'11111111-1111-4111-8111-111111111111',email:'p@example.com',role:'partner',status:'active'};
const admin={...partner,role:'admin'};
test('catalog and moderation controllers enforce session guard',()=>{
 for(const controller of [GuideCatalogController,GuidePublicationController]){
  assert.ok((Reflect.getMetadata(GUARDS_METADATA,controller)||[]).includes(AccessGuard));
 }
});
test('partner cannot publish or inspect moderation queue',async()=>{
 const db={transaction:()=>{throw Error('Must not reach DB')},query:()=>{throw Error('Must not reach DB')}};
 const service=new GuidePublicationService(db);
 await assert.rejects(service.list(partner),e=>e.status===403);
 await assert.rejects(service.decide(partner,'11111111-1111-4111-8111-111111111111',true),e=>e.status===403);
});
test('publication rejects empty guide',async()=>{
 const db={transaction:fn=>fn({query:async sql=>{
  if(sql.includes('FOR UPDATE'))return [{id:'11111111-1111-4111-8111-111111111111',published:false,title:'Demo'}];
  if(sql.includes('momap_guide_pois'))return [{poi_count:0,event_count:0}];
  throw Error('Unexpected SQL');
 }})};
 await assert.rejects(new GuidePublicationService(db).decide(admin,'11111111-1111-4111-8111-111111111111',true),e=>e.status===400);
});
test('catalog validates coordinates and radius before querying',async()=>{
 const db={query:()=>{throw Error('Must not reach DB')}};
 await assert.rejects(new GuideCatalogService(db).search(partner,{lng:'NaN'}),e=>e.status===400);
 await assert.rejects(new GuideCatalogService(db).search(partner,{radiusKm:'500'}),e=>e.status===400);
});
