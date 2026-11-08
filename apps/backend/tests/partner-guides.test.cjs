const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {GUARDS_METADATA}=require('@nestjs/common/constants');
const {AccessGuard}=require('../dist/modules/access/access.guard.js');
const {PartnerGuidesController}=require('../dist/modules/guides/partner-guides.controller.js');
const {PartnerGuidesService}=require('../dist/modules/guides/partner-guides.service.js');
const org='11111111-1111-4111-8111-111111111111';
const user={id:'22222222-2222-4222-8222-222222222222',role:'partner',status:'active'};
const config={organizationId:org,slug:'hotel-guide',branding:{title:'Hotel Guide',accentColor:'#112233'},map:{center:[19,47],zoom:11},categories:['attraction'],poiIds:[],eventIds:[],published:false};
test('all partner guide routes are protected at controller level',()=>{
 assert.ok((Reflect.getMetadata(GUARDS_METADATA,PartnerGuidesController)||[]).includes(AccessGuard));
});
test('partner cannot create guide without organization membership',async()=>{
 const db={transaction:async fn=>fn({query:async sql=>sql.includes('momap_organization_memberships')?[]:Promise.reject(Error('Unexpected SQL'))})};
 await assert.rejects(new PartnerGuidesService(db).create(user,config),e=>e.status===403);
});
test('partner cannot self-publish guide',async()=>{
 const db={transaction:()=>{throw Error('Must not reach DB')}};
 await assert.rejects(new PartnerGuidesService(db).create(user,{...config,published:true}),e=>e.status===400);
});
test('partner cannot access another organization guide',async()=>{
 const db={query:async()=>[]};
 await assert.rejects(new PartnerGuidesService(db).get(user,org),e=>e.status===404);
});
