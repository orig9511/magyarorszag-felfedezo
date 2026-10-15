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
const iconFixture = [['path',{d:'M0 0L1 1'}]];
const visuals = load('apps/frontend/src/app/core/config/category-visuals.ts', {'../../shared/icons/icons': {ICONS:Object.fromEntries(['Landmark','Utensils','BedDouble','Trees','CalendarDays','MapPin'].map(key=>[key,iconFixture]))}});
const { ExploreComponent } = load('apps/frontend/src/app/features/explore/explore.component.ts', {
  '@angular/core': angular, '@angular/common': {}, '@angular/router': {}, 'lucide-angular': {},
  '../../core/services/discovery.model': model,
  '../../core/services/county.service': { countySlug: c => c.name.toLowerCase() },
  '../landing/landing-content': { CATEGORIES: [{ key: 'attraction', name: 'Látnivaló' }, { key: 'event', name: 'Esemény' }] },
  '../../core/config/category-visuals':visuals, '../../shared/icons/icons': { ICONS: {} }, '../../shared/icons/category-icon.component': {},
});
const bounds = { minLng: 16, minLat: 45, maxLng: 23, maxLat: 49, zoom: 9 };
const poi = (id, lng = 19) => ({ id, name: id, category: 'attraction', countyId: 'county-a', location: { type: 'Point', coordinates: [lng,47] } });
function harness(poiRequest = () => rx.of([poi('place-a')]), eventRequest = () => rx.of([])) {
  const calls = { poi: [], event: [], places: [], selected: [] };
  const maps = {
    mode$: new rx.BehaviorSubject('overview'), status$: new rx.BehaviorSubject('ready'), viewportChange$: new rx.Subject(),
    countyClick$: new rx.Subject(), placeClick$: new rx.Subject(), placeDetails$: new rx.Subject(), popupClosed$: new rx.Subject(), setCounties() {}, setPlaces(p) { calls.places.push(p); },
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
  '../config/map-style':{MAP_STYLE:{version:8,sources:{},layers:[]}},'./discovery.model':model, './country-mask':load('apps/frontend/src/app/core/services/country-mask.ts'), './map-pins':{MapPins:class{setPlaces(){}selectPlace(){}highlightPlace(){}destroy(){}}},
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

test('POIs render without waiting for an event request that has not responded',()=>clock(s=>{
  const h=harness(()=>rx.of([poi('date-independent')]),()=>rx.NEVER);h.roam();
  s.schedule(()=>{assert.equal(h.component.visibleCards.filter(c=>c.kind==='poi').length,1);h.component.ngOnDestroy();},401);
}));
test('changing event date does not issue another POI request or remove its result',()=>clock(s=>{
  const h=harness();h.roam();
  s.schedule(()=>h.component.setEventDatePreset('today'),450);
  s.schedule(()=>{assert.equal(h.calls.poi.length,1);assert.equal(h.calls.event.length,2);assert.equal(h.component.visibleCards.filter(c=>c.kind==='poi').length,1);h.component.ngOnDestroy();},851);
}));
test('places-only hides dates and date changes cannot refetch its POIs',()=>clock(s=>{
  const h=harness();h.component.contentMode='pois';h.roam();assert.equal(h.component.showEventDateFilters,false);
  s.schedule(()=>h.component.setEventDatePreset('today'),450);
  s.schedule(()=>{assert.equal(h.calls.poi.length,1);assert.equal(h.calls.event.length,0);h.component.ngOnDestroy();},851);
}));
function insideRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if(((a[1]>point[1])!==(b[1]>point[1]))&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
function maskContains(geometry,point){const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;return polys.some(p=>insideRing(point,p[0])&&!p.slice(1).some(r=>insideRing(point,r)));}
const rectangle=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]];
test('overlapping county exteriors are unioned before subtraction from the world mask',()=>{
 const service=new MapService();service.initializeMap({});const m=FakeMap.last;m.emit('style.load');
 service.setCounties([{id:'a',active:true,displayGeometry:{type:'Polygon',coordinates:[rectangle(0,0,2,2)]}},{id:'b',active:true,displayGeometry:{type:'MultiPolygon',coordinates:[[rectangle(1,0,3,2)]]}}]);
 const g=m.getSource('country-mask').data.features[0].geometry;
 assert.equal(maskContains(g,[1.5,1]),false,'overlapping Hungarian geography must remain unmasked');
 assert.equal(maskContains(g,[4,1]),true); const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates; assert.equal(polygons.reduce((n,p)=>n+p.length-1,0),1,'overlapping rings must be dissolved into one coverage hole'); service.destroy();
});
test('a genuine polygon hole stays outside country coverage; winding is normalized',()=>{
 const service=new MapService();service.initializeMap({});const m=FakeMap.last;m.emit('style.load');
 service.setCounties([{id:'a',active:true,displayGeometry:{type:'Polygon',coordinates:[rectangle(0,0,3,3).reverse(),rectangle(1,1,2,2)]}}]);
 const g=m.getSource('country-mask').data.features[0].geometry;
 assert.equal(maskContains(g,[1.5,1.5]),true,'a genuine hole must not be invented as country land');
 assert.equal(maskContains(g,[.5,.5]),false);service.destroy();
});

class FakeElement {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.properties={};this.textContent='';this.style={setProperty:(k,v)=>this.properties[k]=v};this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key),contains:key=>this.classes.has(key)};}
  setAttribute(k,v){this.attributes[k]=String(v);} getAttribute(k){return this.attributes[k];}
  appendChild(child){this.children.push(child);return child;} append(...children){children.forEach(c=>this.appendChild(c));}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
  fire(type,extra={}){for(const callback of this.listeners[type]||[])callback({stopPropagation(){},detail:1,...extra});}
  querySelector(selector){const name=selector.slice(1);for(const child of this.children){if(child.className?.split(' ').includes(name))return child;const found=child.querySelector?.(selector);if(found)return found;}return null;}
  contains(element){return this===element||this.children.some(c=>c.contains(element));}
  focus(){global.document.activeElement=this;this.fire('focus');}
}
global.document={createElement:tag=>new FakeElement(tag),createElementNS:(_ns,tag)=>new FakeElement(tag),activeElement:null};
let nextFrame=0;const frames=new Map();
global.requestAnimationFrame=callback=>{frames.set(++nextFrame,callback);return nextFrame;};global.cancelAnimationFrame=id=>frames.delete(id);
function flushPins(){const pending=[...frames.values()];frames.clear();pending.forEach(f=>f());}
class FakeMarker{
  static created=[];
  constructor(options){this.options=options;this.removed=false;FakeMarker.created.push(this);}
  setLngLat(position){this.position=position;return this;}addTo(map){this.map=map;return this;}remove(){this.removed=true;return this;}
}
class FakePopup{
  static last;
  constructor(options){this.options=options;this.open=false;this.listeners={};this.element=new FakeElement('div');const close=new FakeElement('button');close.className='maplibregl-popup-close-button';this.element.append(close);FakePopup.last=this;}
  setLngLat(position){this.position=position;return this;}setDOMContent(content){this.content=content;this.element.append(content);return this;}addTo(map){this.open=true;return this;}
  on(type,callback){this.listeners[type]=callback;return this;}getElement(){return this.element;}isOpen(){return this.open;}remove(){this.open=false;this.listeners.close?.();return this;}
}
const {MapPins,createPin}=load('apps/frontend/src/app/core/services/map-pins.ts',{
  'maplibre-gl':{default:{Marker:FakeMarker,Popup:FakePopup}},'../config/category-visuals':visuals,'./discovery.model':model,
});
function pinHarness(places){
 const calls={selected:[],details:[],closed:0,zoom:[]};const map=new FakeMap({});map.features=places.map(p=>({geometry:{type:'Point',coordinates:p.location.coordinates},properties:{key:model.placeKey(p)}}));
 map.querySourceFeatures=()=>map.features;map.getBounds=()=>({contains:p=>p[0]>=16&&p[0]<=23&&p[1]>=45&&p[1]<=49});map.easeTo=options=>calls.zoom.push(options);
 const renderer=new MapPins(map,key=>{calls.selected.push(key);renderer.selectPlace(key);},key=>calls.details.push(key),()=>calls.closed++);
 renderer.setPlaces(places);flushPins();return{renderer,map,calls};
}
const pinPlace=(id,category='attraction')=>({...poi(id),kind:'poi',title:id,category});
test('one category palette drives pins, event identity and safe fallback',()=>{
 const place=pinPlace('a','restaurant'),v=visuals.categoryVisual(place);const button=createPin(place,()=>{},()=>{});
 assert.equal(button.properties['--category-color'],v.color);assert.ok(button.getAttribute('aria-label').includes(v.label));
 assert.equal(visuals.categoryVisual({...place,kind:'event'}),visuals.CATEGORY_VISUALS.event);
 assert.equal(visuals.categoryVisual({...place,category:'__proto__'}),visuals.CATEGORY_VISUALS.other);
});
test('pin is a native accessible button with focus highlighting, selected state and tooltip',()=>{
 const h=pinHarness([pinPlace('a')]);const pin=h.renderer.records.get('poi:a').button;
 assert.equal(pin.tagName,'BUTTON');assert.equal(pin.type,'button');assert.equal(pin.getAttribute('aria-haspopup'),'dialog');assert.ok(pin.getAttribute('aria-describedby'));
 pin.focus();assert.equal(pin.classList.contains('is-highlighted'),true);pin.fire('click',{detail:0});
 assert.deepEqual(h.calls.selected,['poi:a']);assert.equal(pin.getAttribute('aria-pressed'),'true');
 assert.equal(document.activeElement,FakePopup.last.getElement().querySelector('.maplibregl-popup-close-button'));h.renderer.destroy();
});
test('a touch-equivalent single click opens a coordinate-anchored popup without switching to a county',()=>{
 const place=pinPlace('a');const h=pinHarness([place]);h.renderer.records.get('poi:a').button.fire('click');
 const popup=FakePopup.last;assert.deepEqual(popup.position,place.location.coordinates);assert.equal(popup.options.anchor,undefined,'MapLibre must auto-anchor at viewport edges');assert.ok(popup.options.offset.bottom[1]<0);
 assert.equal(popup.getElement().getAttribute('role'),'dialog');popup.content.children.at(-1).fire('click');assert.deepEqual(h.calls.details,['poi:a']);
 popup.remove();assert.equal(h.calls.closed,1);assert.equal(h.renderer.records.get('poi:a').button.getAttribute('aria-pressed'),'false');h.renderer.destroy();
});
test('popup and tooltip text cannot interpret HTML from an API title',()=>{
 const title='<img src=x onerror=alert(1)>';const h=pinHarness([pinPlace(title)]);h.renderer.selectPlace('poi:'+title);const popup=FakePopup.last;
 assert.equal(popup.content.children.find(c=>c.tagName==='H2').textContent,title);assert.equal(popup.content.children.some(c=>c.tagName==='IMG'),false);h.renderer.destroy();
});
test('settled marker updates deduplicate tile copies, ignore offscreen features and reuse nodes',()=>{
 const places=Array.from({length:200},(_,i)=>pinPlace('p'+i));const before=FakeMarker.created.length;const h=pinHarness(places);
 h.map.features.push(h.map.features[0],{geometry:{type:'Point',coordinates:[0,0]},properties:{key:'poi:p0'}});h.renderer.sync();
 assert.equal(h.renderer.records.size,200);assert.equal(FakeMarker.created.length-before,200);
 h.renderer.highlightPlace('poi:p1');h.renderer.sync();assert.equal(FakeMarker.created.length-before,200);h.renderer.setPlaces([]);flushPins();assert.equal(h.renderer.records.size,0);h.renderer.destroy();
});
test('cluster buttons show counts; stale expansion cannot move the new dataset',async()=>{
 const h=pinHarness([pinPlace('a')]);let resolve;h.map.sources.set('places',{getClusterExpansionZoom:()=>new Promise(r=>resolve=r)});
 h.map.features=[{geometry:{type:'Point',coordinates:[19,47]},properties:{cluster:true,cluster_id:3,point_count:12}}];h.renderer.sync();
 const cluster=[...h.renderer.records.values()][0].button;assert.equal(cluster.textContent,'12');assert.match(cluster.getAttribute('aria-label'),/12/);cluster.fire('click');
 h.renderer.setPlaces([pinPlace('b')]);resolve(12);await Promise.resolve();assert.equal(h.calls.zoom.length,0);h.renderer.destroy();
});
test('closing an old popup when selecting another place cannot clear the new selection',()=>{
 const h=pinHarness([pinPlace('a'),pinPlace('b')]);h.renderer.selectPlace('poi:a');h.renderer.selectPlace('poi:b');
 assert.equal(h.calls.closed,0);assert.equal(h.renderer.records.get('poi:b').button.getAttribute('aria-pressed'),'true');h.renderer.destroy();
});
test('geometry mask preserves islands, closes cloned input rings and never mutates source geography',()=>{
 const {buildCountryMask}=load('apps/frontend/src/app/core/services/country-mask.ts');
 const geometry={type:'MultiPolygon',coordinates:[[rectangle(0,0,2,2).slice(0,-1)],[rectangle(3,0,4,1)]]};const snapshot=JSON.stringify(geometry);
 const mask=buildCountryMask([geometry]);assert.equal(JSON.stringify(geometry),snapshot);assert.equal(maskContains(mask.features[0].geometry,[3.5,.5]),false);assert.equal(maskContains(mask.features[0].geometry,[2.5,.5]),true);
});

test('changing dates while POIs are in flight does not cancel or delay them',()=>clock(s=>{
 let cancelledBeforeCompletion=0;const h=harness(()=>new rx.Observable(sub=>{let finished=false;const work=s.schedule(()=>{finished=true;sub.next([poi('unblocked')]);sub.complete();},800);return()=>{if(!finished)cancelledBeforeCompletion++;work.unsubscribe();};}),()=>rx.NEVER);h.roam();
 s.schedule(()=>h.component.setEventDatePreset('today'),450);s.schedule(()=>h.component.setEventDatePreset('tomorrow'),600);
 s.schedule(()=>{assert.equal(h.calls.poi.length,1);assert.equal(cancelledBeforeCompletion,0);assert.equal(h.component.visibleCards[0].id,'unblocked');h.component.ngOnDestroy();},1201);
}));
test('the country union fills an interior administrative hole when another county covers it',()=>{
 const {buildCountryMask}=load('apps/frontend/src/app/core/services/country-mask.ts');const outer={type:'Polygon',coordinates:[rectangle(0,0,4,4),rectangle(1,1,2,2).reverse()]};const inner={type:'MultiPolygon',coordinates:[[rectangle(1,1,2,2)]]};
 const mask=buildCountryMask([outer,inner]);assert.equal(maskContains(mask.features[0].geometry,[1.5,1.5]),false);assert.equal(maskContains(mask.features[0].geometry,[4.5,2]),true);
 for(const polygon of mask.features[0].geometry.coordinates){for(const [index,ring] of polygon.entries()){let twiceArea=0;for(let i=1;i<ring.length;i++)twiceArea+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];assert.ok(index===0?twiceArea>0:twiceArea<0,'GeoJSON output winding must be normalized');}}
});
test('pin category colors maintain readable dark pictograms',()=>{
 const luminance=hex=>{const colors=hex.replace('#','').match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*colors[0]+.7152*colors[1]+.0722*colors[2];};
 const ink=luminance('#101c17');for(const entry of Object.values(visuals.CATEGORY_VISUALS))assert.ok((luminance(entry.color)+.05)/(ink+.05)>=4.5,entry.key+' must have at least 4.5:1 contrast');
});
