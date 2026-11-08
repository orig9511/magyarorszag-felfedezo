const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { GUARDS_METADATA } = require('@nestjs/common/constants');
const { AdminTokenGuard } = require('../dist/modules/auth/admin-token.guard.js');
const { GuidesController } = require('../dist/modules/guides/guides.controller.js');
const { GuidesService } = require('../dist/modules/guides/guides.service.js');

const id = '11111111-1111-4111-8111-111111111111';
const config = {
  slug:'sample-hotel', organizationId:id,
  branding:{title:'Sample Hotel',accentColor:'#112233'},
  map:{center:[19.5,47.2],zoom:10},categories:['attraction'],
  poiIds:[],eventIds:[],published:false,
};
const guard = method => (Reflect.getMetadata(GUARDS_METADATA, GuidesController.prototype[method]) || []).includes(AdminTokenGuard);
test('all operator guide routes require admin guard',()=>{
  for (const name of ['operatorGet','operatorCreate','operatorReplace']) assert.equal(guard(name),true,name);
  assert.equal(guard('publicGuide'),false);
});
test('draft guide is never exposed by public endpoint',async()=>{
  const db = {query: async(sql) => sql.includes('published = true') ? [] : [{id}]};
  const service = new GuidesService(db);
  await assert.rejects(service.publicGuide('sample-hotel'), error=>error.status===404);
});
test('operator cannot create published guide',async()=>{
  const service = new GuidesService({transaction:()=>{throw Error('should not run')}});
  await assert.rejects(service.operatorCreate({...config,published:true}), error=>error.status===400);
});
test('operator cannot create invalid guide',async()=>{
  const service = new GuidesService({transaction:()=>{throw Error('should not run')}});
  await assert.rejects(service.operatorCreate({...config,slug:'../../bad'}), error=>error.status===400);
});
test('public endpoint rejects unsafe slug before database access',async()=>{
  const service = new GuidesService({query:()=>{throw Error('should not query')}});
  await assert.rejects(service.publicGuide('../admin'), error=>error.status===400);
});
