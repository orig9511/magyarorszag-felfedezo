const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {GUARDS_METADATA}=require('@nestjs/common/constants');
const {AccessController}=require('../dist/modules/access/access.controller.js');
const {AccessService}=require('../dist/modules/access/access.service.js');
const {AccessGuard}=require('../dist/modules/access/access.guard.js');
const guard=(name)=>(Reflect.getMetadata(GUARDS_METADATA,AccessController.prototype[name])||[]).includes(AccessGuard);
test('protected access endpoints use server guard',()=>{
 for(const name of ['logout','me','organizations','guides','pending','approve','reject']) assert.equal(guard(name),true,name);
 for(const name of ['register','login']) assert.equal(guard(name),false,name);
});
test('registration rejects self-assigned admin type',async()=>{
 const svc=new AccessService({transaction:()=>{throw Error('DB must not be reached')}},{});
 await assert.rejects(svc.register({email:'a@b.com',password:'long-password-123',name:'Test',slug:'test',businessType:'admin'}),e=>e.status===400);
});
test('only admin can approve partner registration',async()=>{
 const svc=new AccessService({query:()=>{throw Error('DB must not be reached')}},{});
 await assert.rejects(svc.decide({id:'x',email:'x',role:'partner',status:'active'},'11111111-1111-4111-8111-111111111111',true),e=>e.status===403);
});
test('login rejects invalid credentials before database lookup',async()=>{
 const svc=new AccessService({query:()=>{throw Error('DB must not be reached')}},{});
 await assert.rejects(svc.login({email:'not-an-email',password:'x'}),e=>e.status===401);
});
