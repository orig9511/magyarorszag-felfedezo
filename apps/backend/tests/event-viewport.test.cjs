const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {ValidationPipe}=require('@nestjs/common');
const {DataSource}=require('typeorm');
const {GetEventsDto}=require('../dist/modules/event/dto/get-events.dto');
const {Event}=require('../dist/modules/event/event.entity');
const {EventService}=require('../dist/modules/event/event.service');
const pipe=new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true});
const input={minLat:'45',minLon:'16',maxLat:'49',maxLon:'23',days:'7'};
const validate=q=>pipe.transform(q,{type:'query',metatype:GetEventsDto});
test('real ValidationPipe accepts numeric HTTP strings',async()=>{const q=await validate(input);assert.equal(q.minLat,45);assert.equal(q.days,7);});
test('actual TypeORM viewport query uses SRID 4326 and expanded categories',async()=>{
 const ds=new DataSource({type:'postgres',entities:[Event]});await ds.buildMetadatas();
 const qb=ds.getRepository(Event).createQueryBuilder('event');qb.getMany=async()=>[];
 await new EventService({createQueryBuilder:()=>qb}).getEventsByViewport(45,16,49,23,['concert','festival']);
 const [sql,params]=qb.getQueryAndParameters();assert.match(sql,/ST_MakeEnvelope\([^)]*4326\)/);assert.ok(params.includes('concert'));assert.ok(params.includes('festival'));
});
const {EventController}=require('../dist/modules/event/event.controller');
const {eventDateRange,budapestDate}=require('../dist/modules/event/event-date-range');
test('invalid numeric query values fail without weakening whitelist',async()=>{
 for(const value of ['', ' ', 'NaN','Infinity','nonsense','0x2f',[],['45','46'],null,true,'91']) {
  await assert.rejects(validate({...input,minLat:value}),e=>e.getStatus()===400);
 }
 for(const days of ['0','-1','1.5','61','7junk']) await assert.rejects(validate({...input,days}),e=>e.getStatus()===400);
 await assert.rejects(validate({...input,unexpected:'1'}),e=>e.getStatus()===400);
 for(const dateFrom of ['0000-01-01','2026-02-30','2026-13-01','2026-10-15T00:00:00Z'])
  await assert.rejects(validate({...input,days:undefined,dateFrom,dateTo:'2026-10-16'}),e=>e.getStatus()===400);
});
test('controller rejects inverted/degenerate viewports and ambiguous date ranges before querying',async()=>{
 const controller=new EventController({getEventsByViewport(){assert.fail('must not query')}});
 for(const change of [{minLat:50},{maxLat:45},{minLon:24},{maxLon:16},{dateFrom:'2026-10-15'},
  {dateFrom:'2026-10-15',dateTo:'2026-10-16'}, {days:undefined,dateFrom:'2026-10-16',dateTo:'2026-10-15'}])
  await assert.rejects(controller.getByViewport({...await validate(input),...change}),e=>e.getStatus()===400);
});
test('Budapest calendar ranges cover midnight and DST using wall-clock timestamp parameters',()=>{
 assert.equal(budapestDate(new Date('2026-10-14T22:30:00Z')),'2026-10-15');
 assert.deepEqual(eventDateRange({days:1},new Date('2026-10-14T22:30:00Z')),
  {fromDate:'2026-10-15 00:00:00',toDate:'2026-10-16 00:00:00'});
 for(const day of ['2026-03-29','2026-10-25']) {
  const range=eventDateRange({dateFrom:day,dateTo:day});assert.equal(range.fromDate,day+' 00:00:00');
  assert.equal(range.toDate,day.slice(0,8)+(Number(day.slice(8))+1)+' 00:00:00');
 }
 assert.deepEqual(eventDateRange({days:7},new Date('2026-10-15T10:00:00Z')),
  {fromDate:'2026-10-15 00:00:00',toDate:'2026-10-22 00:00:00'});
 assert.deepEqual(eventDateRange({}),{fromDate:undefined,toDate:undefined});
 assert.throws(()=>eventDateRange({dateFrom:'9999-12-31',dateTo:'9999-12-31'}),e=>e.getStatus()===400);
});
test('controller passes explicit dates and deduplicated categories to the real query seam',async()=>{
 let args;const controller=new EventController({getEventsByViewport:async(...a)=>{args=a;return []}});
 const result=await controller.getByViewport(await validate({...input,days:undefined,dateFrom:'2026-10-16',dateTo:'2026-10-16',categories:'concert, festival,concert'}));
 assert.deepEqual(result,[]);assert.deepEqual(args.slice(4),[['concert','festival'],undefined,'2026-10-16 00:00:00','2026-10-17 00:00:00']);
});
