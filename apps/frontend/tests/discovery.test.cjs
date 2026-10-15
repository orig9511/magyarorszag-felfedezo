// No browser, HTTP, database or emitted build files. Tests execute the actual TS classes in memory.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const rx = require('rxjs');
const { TestScheduler } = require('rxjs/testing');
const root = path.resolve(__dirname, '../../..');
function load(relative, stubs = {}) {
  const filename = path.join(root, relative), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, emitDecoratorMetadata: false,
  }}).outputText;
  mod._compile(code, filename); return mod.exports;
}
const model = load('apps/frontend/src/app/core/services/discovery.model.ts');
const decorator = () => () => {};
const angular = { Component: decorator, Injectable: decorator, ViewChild: decorator, HostListener: decorator };
const { ExploreComponent } = load('apps/frontend/src/app/features/explore/explore.component.ts', {
  '@angular/core': angular, '@angular/common': {}, '@angular/router': {}, 'lucide-angular': {},
  '../../core/services/discovery.model': model,
  '../../core/services/county.service': { countySlug: c => c.name.toLowerCase() },
  '../landing/landing-content': { CATEGORIES: [{ key: 'attraction', name: 'Látnivaló' }, { key: 'event', name: 'Esemény' }] },
  '../../shared/icons/icons': { ICONS: {} }, '../../shared/icons/category-icon.component': {},
});
const bounds = { minLng: 16, minLat: 45, maxLng: 23, maxLat: 49, zoom: 9 };
const poi = (id, lng = 19) => ({ id, name: id, category: 'attraction', countyId: 'county-a', location: { type: 'Point', coordinates: [lng,47] } });
function harness(poiRequest = () => rx.of([poi('place-a')]), eventRequest = () => rx.of([])) {
  const calls = { poi: [], event: [], places: [], selected: [] };
  const maps = {
    mode$: new rx.BehaviorSubject('overview'), status$: new rx.BehaviorSubject('ready'), viewportChange$: new rx.Subject(),
    countyClick$: new rx.Subject(), placeClick$: new rx.Subject(), setCounties() {}, setPlaces(p) { calls.places.push(p); },
    selectPlace(k) { calls.selected.push(k); }, highlightPlace() {}, clearCountyDetail() {}, destroy() {}, flyTo() {},
  };
  const params = new rx.BehaviorSubject({ get: () => null });
  const component = new ExploreComponent(maps,
    { getPOIsByViewport(...args) { calls.poi.push(args); return poiRequest(...args); } },
    { getEventsByViewport(...args) { calls.event.push(args); return eventRequest(...args); } },
    { getAllCounties: () => rx.of([]) }, { queryParamMap: params }, { navigate() {} });
  component.ngOnInit();
  return { component, maps, calls, roam(v = bounds) { maps.mode$.next('roam'); maps.viewportChange$.next(v); } };
}
const clock = callback => { const scheduler = new TestScheduler((a,b) => assert.deepEqual(a,b)); scheduler.run(() => callback(scheduler)); };

test('overview performs no POI or event request, even if a viewport is published', () => clock(s => {
  const h = harness(); h.maps.viewportChange$.next(bounds);
  s.schedule(() => { assert.equal(h.calls.poi.length,0); assert.equal(h.calls.event.length,0); h.component.ngOnDestroy(); }, 1000);
}));
test('roam waits 400ms and map/list use the same keyed places', () => clock(s => {
  const h = harness(); h.roam();
  s.schedule(() => assert.equal(h.calls.poi.length,0),399);
  s.schedule(() => { assert.equal(h.calls.poi.length,1); assert.equal(h.calls.event.length,1);
    assert.deepEqual(h.calls.places.at(-1),h.component.visibleCards); h.component.ngOnDestroy(); },401);
}));
test('moving cancels active requests immediately; an old response cannot replace the new area', () => clock(s => {
  let cancelled = 0;
  const h = harness((minLat,maxLat,minLng) => new rx.Observable(sub => {
    const work = s.schedule(() => { sub.next([poi(minLng === 16 ? 'old' : 'new')]); sub.complete(); },700);
    return () => { work.unsubscribe(); cancelled++; };
  }));
  h.roam(); s.schedule(() => h.maps.status$.next('moving'),450);
  s.schedule(() => { assert.equal(cancelled,1); h.maps.status$.next('ready'); h.maps.viewportChange$.next({ ...bounds,minLng:17 }); },500);
  s.schedule(() => { assert.deepEqual(h.component.visibleCards,[]); },1200);
  s.schedule(() => { assert.equal(h.component.visibleCards[0].id,'new'); h.component.ngOnDestroy(); },1601);
}));
test('returning to overview during debounce prevents a pending request', () => clock(s => {
  const h = harness(); h.roam(); s.schedule(() => h.maps.mode$.next('overview'),100);
  s.schedule(() => { assert.equal(h.calls.poi.length,0); assert.deepEqual(h.component.visibleCards,[]); h.component.ngOnDestroy(); },700);
}));
test('event failure is explicit and preserves successful POIs', () => clock(s => {
  const h = harness(undefined, () => rx.throwError(() => new Error('fixture event failure'))); h.roam();
  s.schedule(() => { assert.match(h.component.eventError,/események/); assert.equal(h.component.visibleCards.length,1); h.component.ngOnDestroy(); },401);
}));
test('POI failure is explicit and preserves successful located events', () => clock(s => {
  const h = harness(() => rx.throwError(() => new Error('fixture POI failure')), () => rx.of([{ id:'event-a',title:'Teszt esemény',category:'concert', startTime:'2099-01-01', location:{type:'Point',coordinates:[19,47]},countyId:'county-a' }])); h.roam();
  s.schedule(() => { assert.match(h.component.poiError,/helyek/); assert.equal(h.component.visibleCards[0].kind,'event'); h.component.ngOnDestroy(); },401);
}));
test('county introduction dismissal leaves filters, selection and map state intact', () => {
  const h = harness(); h.component.selectedCounty = { id:'county-a' }; h.component.introVisible = true;
  h.component.selectedCategories.add('attraction'); h.component.dismissIntroduction();
  assert.equal(h.component.introVisible,false); assert.equal(h.component.selectedCounty.id,'county-a'); assert.equal(h.component.selectedCategories.size,1); h.component.ngOnDestroy();
});
test('free roam event calls carry viewport and no selected-county restriction', () => clock(s => {
  const h = harness(); h.component.selectedCounty = {id:'county-a'}; h.roam({...bounds,minLng:20});
  s.schedule(() => { assert.equal(h.calls.event[0][1],20); assert.equal(h.calls.event[0][4].countyId,undefined); h.component.ngOnDestroy(); },401);
}));
test('empty filtered results never request a nationwide count fallback', () => clock(s => {
  const h = harness(() => rx.of([])); h.component.selectedCategories.add('attraction'); h.roam();
  s.schedule(() => { assert.equal(h.calls.poi.length,1); h.component.ngOnDestroy(); },1000);
}));
test('cache reuses exact viewport/filter within TTL, retry bypasses it', () => clock(s => {
  const h = harness(); h.roam();
  s.schedule(() => h.maps.viewportChange$.next({...bounds}),450);
  s.schedule(() => { assert.equal(h.calls.poi.length,1); h.component.retry(); },900);
  s.schedule(() => { assert.equal(h.calls.poi.length,2); h.component.ngOnDestroy(); },1301);
}));
test('keys keep POI/event IDs separate and distinct edge viewports do not collide', () => {
  assert.notEqual(model.placeKey({kind:'poi',id:'same'}),model.placeKey({kind:'event',id:'same'}));
  assert.notEqual(model.viewportKey(bounds,[]),model.viewportKey({...bounds,minLng:16.000001},[]));
});
test('nonfinite, unlocated and off-viewport records cannot desynchronize map and cards', () => {
  const good={...poi('good'),kind:'poi',title:'good'}, bad={...good,location:{type:'Point',coordinates:[NaN,47]}};
  assert.equal(model.hasMapLocation(bad),false);
  assert.deepEqual(model.visiblePlaces([good,bad,{...good,location:undefined},{...good,location:{type:'Point',coordinates:[1,1]}}],bounds),[good]);
});

class FakeBounds { constructor(){this.points=[];} extend(p){this.points.push(p);} }
class FakeMap {
  static last;
  constructor(options) { FakeMap.last=this; this.options=options;this.events=[];this.sources=new Map();this.layers=new Map();this.moving=false;
    for(const key of ['dragPan','scrollZoom','boxZoom','keyboard','doubleClickZoom','touchZoomRotate','dragRotate','touchPitch']) this[key]={ enabled:false,disable(){this.enabled=false;},enable(){this.enabled=true;},disableRotation(){} };
    this.buttons=[{disabled:false,setAttribute(){}}]; }
  on(event,layer,fn){this.events.push({event,layer:typeof layer==='string'?layer:null,fn:fn||layer});}
  off(event,fn){this.events=this.events.filter(e=>!(e.event===event&&e.fn===fn));}
  emit(event,data={}){for(const e of [...this.events])if(e.event===event&&!e.layer)e.fn(data);}
  addControl(){} getContainer(){return {querySelectorAll:()=>this.buttons};}
  fitBounds(bounds,options){this.fit={bounds,options};this.moving=options.duration>0;}
  isMoving(){return this.moving;} stop(){this.moving=false;} finish(){this.moving=false;this.emit('moveend');}
  addSource(id,s){this.sources.set(id,{...s,setData(data){this.data=data;}});} getSource(id){return this.sources.get(id);}
  addLayer(layer){this.layers.set(layer.id,layer);} getLayer(id){return this.layers.get(id);} setFilter(){}
  getBounds(){return {getSouth:()=>45,getNorth:()=>49,getWest:()=>16,getEast:()=>23};} getZoom(){return 9;}
  resize(){} remove(){this.removed=true;}
}
global.ResizeObserver=class{observe(){}disconnect(){}};
global.window={matchMedia:()=>({matches:false})};
const { MapService }=load('apps/frontend/src/app/core/services/map.service.ts',{
  '@angular/core':angular,'maplibre-gl':{default:{Map:FakeMap,NavigationControl:class{}},LngLatBounds:FakeBounds},
  '../config/map-style':{MAP_STYLE:{version:8,sources:{},layers:[]}},'./discovery.model':model,
});
test('map locks all navigation and zoom buttons before county selection',()=>{
  const service=new MapService();service.initializeMap({});const m=FakeMap.last;
  for(const key of ['dragPan','scrollZoom','boxZoom','keyboard','doubleClickZoom','touchZoomRotate'])assert.equal(m[key].enabled,false);
  assert.equal(m.buttons[0].disabled,true);assert.equal(m.options.renderWorldCopies,false);service.destroy();
});
test('county chosen before map load is retained; unlock occurs after animation; overview relocks',()=>{
  const service=new MapService(),modes=[],views=[];service.mode$.subscribe(m=>modes.push(m));service.viewportChange$.subscribe(v=>views.push(v));
  service.showCountyDetail('county-a',{type:'MultiPolygon',coordinates:[[[[19,47],[20,47],[20,48],[19,47]]]]});
  service.initializeMap({});const m=FakeMap.last;m.emit('style.load');assert.equal(modes.at(-1),'transition');assert.equal(m.dragPan.enabled,false);
  m.finish();assert.equal(modes.at(-1),'roam');assert.equal(m.dragPan.enabled,true);assert.ok(views.length>0);
  service.resetView();assert.equal(modes.at(-1),'overview');assert.equal(m.dragPan.enabled,false);service.destroy();
});
test('destroy and reinitialize discard the previous county and place state',()=>{
  const service=new MapService();service.initializeMap({});FakeMap.last.emit('style.load');service.destroy();service.initializeMap({});FakeMap.last.emit('style.load');
  assert.equal(FakeMap.last.getSource('places').data.features.length,0);assert.equal(FakeMap.last.getSource('county-detail').data.features.length,0);service.destroy();
});
const { CountyService } = load('apps/frontend/src/app/core/services/county.service.ts', {'@angular/core':angular});
test('county normalization hides only the verified legacy duplicate and never fabricates provenance',()=>{
  const rows=[{id:'legacy',code:'HU-BP',name:'Budapest',active:true},{id:'real',code:'HU-BU',name:'Budapest',active:true},{id:'unknown',code:'HU-BA',name:'Baranya',geometry:{type:'MultiPolygon',coordinates:[]}}];
  const service=new CountyService({get:()=>rx.of(rows)});let result;service.getAllCounties().subscribe(value=>result=value);
  assert.deepEqual(result.map(c=>c.id),['real','unknown']);assert.equal(result[1].active,false);assert.equal(result[0].attribution,undefined);assert.equal(rows.length,3);
});
test('event-only discovery does not send POI requests',()=>clock(s=>{
  const h=harness();h.component.contentMode='events';h.roam();s.schedule(()=>{assert.equal(h.calls.poi.length,0);assert.equal(h.calls.event.length,1);h.component.ngOnDestroy();},401);
}));
test('a newer county transition cancels the old completion callback',()=>{
  const service=new MapService(),modes=[];service.mode$.subscribe(mode=>modes.push(mode));service.initializeMap({});const m=FakeMap.last;m.emit('style.load');
  const g={type:'MultiPolygon',coordinates:[[[[19,47],[20,47],[20,48],[19,47]]]]};
  service.showCountyDetail('a',g);const old=service.transitionEnd;service.showCountyDetail('b',g);old();assert.equal(modes.at(-1),'transition');m.finish();assert.equal(modes.at(-1),'roam');service.destroy();
});
test('reduced-motion camera transitions still unlock without waiting for a timer',()=>{
  global.window.matchMedia=()=>({matches:true});
  const service=new MapService(),modes=[];service.mode$.subscribe(mode=>modes.push(mode));service.initializeMap({});FakeMap.last.emit('style.load');
  service.showCountyDetail('a',{type:'MultiPolygon',coordinates:[[[[19,47],[20,47],[20,48],[19,47]]]]});assert.equal(modes.at(-1),'roam');service.destroy();global.window.matchMedia=()=>({matches:false});
});
