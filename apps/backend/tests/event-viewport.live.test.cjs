// Explicit opt-in: real PostgreSQL/PostGIS and isolated HTTP, no AppModule/scheduler.
// Every pooled connection is server-enforced read-only; no fixture INSERT or DDL.
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {Module,ValidationPipe}=require('@nestjs/common');
const {NestFactory}=require('@nestjs/core');
const {ConfigModule}=require('@nestjs/config');
const {DataSource}=require('typeorm');
const {environmentFiles,requireDatabaseUrl}=require('../dist/environment.config');
const {Event}=require('../dist/modules/event/event.entity');
const {EventService}=require('../dist/modules/event/event.service');
const {EventController}=require('../dist/modules/event/event.controller');
const {eventDateRange}=require('../dist/modules/event/event-date-range');

test('read-only PostgreSQL/PostGIS and real Nest viewport HTTP integration', {skip:process.env.MOMAP_READONLY_TEST!=='1'},async t=>{
 const config=ConfigModule.loadEnvFile(environmentFiles, {});
 const ds=new DataSource({type:'postgres',url:requireDatabaseUrl(process.env.DATABASE_URL||config.DATABASE_URL),entities:[Event],
  synchronize:false,migrationsRun:false,installExtensions:false,logging:false,
  extra:{options:'-c default_transaction_read_only=on',max:1}});
 let app;
 try {
  await ds.initialize();
  assert.equal((await ds.query('SHOW default_transaction_read_only'))[0].default_transaction_read_only,'on');
  assert.equal((await ds.query('SHOW transaction_read_only'))[0].transaction_read_only,'on');
  const counts=await ds.query('SELECT (SELECT count(*)::int FROM events) AS events, (SELECT count(*)::int FROM pois) AS pois');
  const srids=await ds.query('SELECT ST_SRID(location) AS srid, count(*)::int AS count FROM events WHERE location IS NOT NULL GROUP BY 1');
  assert.ok(srids.every(row=>row.srid===4326));
  t.diagnostic('Stored event SRIDs: '+JSON.stringify(srids)+'; row counts: '+JSON.stringify(counts));
  await assert.rejects(ds.query('SELECT ST_Intersects(ST_SetSRID(ST_Point(19,47),4326),ST_MakeBox2D(ST_Point(16,45),ST_Point(23,49)))'),e=>/mixed SRID/i.test(e.message));
  const service=new EventService(ds.getRepository(Event));
  class ReadOnlyTestModule {}
  Module({controllers:[EventController],providers:[{provide:EventService,useValue:service}]})(ReadOnlyTestModule);
  app=await NestFactory.create(ReadOnlyTestModule,{logger:false});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();
  const params={minLat:'45',minLon:'16',maxLat:'49',maxLon:'23'};
  async function get(change={}) {
   const query=new URLSearchParams({...params,...change});
   const response=await fetch(base+'/api/events/viewport?'+query);
   return {status:response.status,body:await response.json()};
  }
  const all=await get();assert.equal(all.status,200);assert.ok(Array.isArray(all.body));
  const instants=await ds.query(`SELECT id, "startTime" AT TIME ZONE 'Europe/Budapest' AS start, "endTime" AT TIME ZONE 'Europe/Budapest' AS finish FROM events`);
  for(const event of all.body) {
   const row=instants.find(r=>r.id===event.id);assert.equal(event.startTime,row.start.toISOString());
   assert.equal(event.endTime,row.finish ? row.finish.toISOString() : null);
  }
  const reference=await ds.query("SELECT id FROM events WHERE status='active' AND ST_Intersects(location,ST_MakeEnvelope(16,45,23,49,4326))");
  assert.deepEqual(all.body.map(e=>e.id).sort(),reference.map(e=>e.id).sort());
  t.diagnostic('Real viewport HTTP 200, returned '+all.body.length+' existing events; independent SQL count '+reference.length);
  const county=all.body[0]?.countyId || 'absent-county';
  assert.equal((await fetch(base+'/api/events/upcoming/'+encodeURIComponent(county)+'?days=7')).status,200);
  for(const days of ['0','-1','1.5','7junk','']) {
   assert.equal((await fetch(base+'/api/events/upcoming/'+encodeURIComponent(county)+'?days='+days)).status,400);
  }
  assert.equal((await fetch(base+'/api/events/upcoming/'+encodeURIComponent(county)+'?days=1&days=2')).status,400);
  for(const change of [{days:'1'},{days:'7'},{dateFrom:'2026-10-15',dateTo:'2026-10-15'},
   {dateFrom:'2026-10-16',dateTo:'2026-10-16'},{categories:'concert,festival'},
   {minLat:'0',minLon:'0',maxLat:'1',maxLon:'1'}]) assert.equal((await get(change)).status,200);
  const empty=await get({minLat:'0',minLon:'0',maxLat:'1',maxLon:'1'});assert.deepEqual(empty.body,[]);
  for(const change of [{minLat:'abc'},{minLat:''},{minLat:'91'},{minLat:'49'},{days:'0'},
   {days:'1.5'},{dateFrom:'2026-02-30',dateTo:'2026-03-01'},
   {dateFrom:'2026-10-16',dateTo:'2026-10-15'},{dateFrom:'2026-10-15'},
   {days:'7',dateFrom:'2026-10-15',dateTo:'2026-10-16'},{categories:'concert,,festival'},{unexpected:'1'}]) {
   const response=await get(change);assert.equal(response.status,400);assert.ok(response.body.message);
  }
  t.diagnostic('Real HTTP: valid days/date/category/empty cases 200; malformed numbers, bounds, dates, categories and unknown keys 400.');

  // Synthetic rows exist only within this SELECT's CTE. The service generates the
  // actual SQL/parameters; PostGIS evaluates it. No mocks of spatial/date predicates.
  const fixtures=[];
  function row(n,start,end,category='concert',location='SRID=4326;POINT(19 47)',status='active') {
   const id='00000000-0000-4000-8000-'+String(n).padStart(12,'0');
   fixtures.push({id,title:'Synthetic SELECT-only fixture',category,startTime:start,endTime:end,location,status,countyId:'fixture-county'});return id;
  }
  const point=row(1,'2026-10-15 10:00:00',null);
  const multi=row(2,'2026-10-14 12:00:00','2026-10-16 12:00:00','festival');
  row(3,'2026-10-14 12:00:00','2026-10-15 00:00:00');
  const tomorrow=row(4,'2026-10-16 00:00:00',null);
  const corner=row(5,'2026-10-15 10:00:00',null,'concert','SRID=4326;POINT(23 49)');
  row(6,'2026-10-15 10:00:00',null,'concert','SRID=4326;POINT(24 47)');
  row(7,'2026-10-15 10:00:00',null,'concert',null);
  row(8,'2026-10-15 10:00:00',null,'concert','SRID=4326;POINT(19 47)','cancelled');
  const zero=row(9,'2026-10-15 00:00:00','2026-10-15 00:00:00');
  const spring=row(10,'2026-03-29 12:00:00',null);
  const autumn=row(11,'2026-10-25 12:00:00',null);
  const fixtureService=new EventService({createQueryBuilder(alias){
   const qb=ds.getRepository(Event).createQueryBuilder(alias);
   qb.getMany=async()=>{
    const [sql,values]=qb.getQueryAndParameters();
    const rows=await ds.query('WITH events AS (SELECT * FROM json_populate_recordset(NULL::public.events, $'+(values.length+1)+'::json)) '+sql,[...values,JSON.stringify(fixtures)]);
    return rows.map(r=>({id:r.event_id,startTime:r.event_startTime}));
   };return qb;
  }});
  const ids=async(day,categories,countyId)=>{
   const range=eventDateRange({dateFrom:day,dateTo:day});
   return (await fixtureService.getEventsByViewport(45,16,49,23,categories,countyId,range.fromDate,range.toDate)).map(e=>e.id).sort();
  };
  assert.deepEqual(await ids('2026-10-15'),[point,multi,corner,zero].sort());
  assert.deepEqual(await ids('2026-10-16'),[multi,tomorrow].sort());
  assert.deepEqual(await ids('2026-10-17'),[]);
  assert.deepEqual(await ids('2026-10-15',['concert','festival']),[point,multi,corner,zero].sort());
  assert.deepEqual(await ids('2026-10-15',['festival']),[multi]);
  assert.deepEqual(await ids('2026-10-15',['absent']),[]);
  assert.deepEqual(await ids('2026-10-15',undefined,'other-county'),[]);
  assert.deepEqual(await ids('2026-03-29'),[spring]);
  assert.deepEqual(await ids('2026-10-25'),[autumn]);
  const springRange=eventDateRange({dateFrom:'2026-03-29',dateTo:'2026-03-29'});
  const springRows=await fixtureService.getEventsByViewport(45,16,49,23,undefined,undefined,springRange.fromDate,springRange.toDate);
  assert.equal(springRows[0].startTime.toISOString(),'2026-03-29T10:00:00.000Z');
  t.diagnostic('Real PostGIS SELECT-only fixtures PASS: Today/Tomorrow, multi-day, null/zero end, midnight exclusion, inclusive bbox corner, out-of-bounds/null location, cancelled, categories, county, empty.');
  assert.deepEqual(await ds.query('SELECT (SELECT count(*)::int FROM events) AS events, (SELECT count(*)::int FROM pois) AS pois'),counts);
 } finally {
  if(app) await app.close();
  if(ds.isInitialized) await ds.destroy();
 }
});

