import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { MAP_STYLE } from '../../core/config/map-style';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccessSessionService } from './access-session.service';

interface CatalogPlace {id:string;kind:'poi'|'event';title:string;category:string;coordinates:[number,number];attribution?:string;address?:string;}
interface GuideForm {
 organizationId:string;slug:string;
 branding:{title:string;accentColor:string;logoUrl?:string};
 map:{center:[number,number];zoom:number};
 categories:string[];poiIds:string[];eventIds:string[];published:boolean;
}
const TYPES=['hotel','restaurant','service'];
@Component({
 selector:'app-guide-editor',standalone:true,imports:[CommonModule,FormsModule,RouterLink],
 template:`
 <main class="editor">
  <a [routerLink]="['/access',vertical]">← Vissza a munkaterületre</a>
  <header><p>MOMAP BUSINESS / TÉRKÉPSZERKESZTŐ</p><h1>{{id?'Vendégtérkép szerkesztése':'Új vendégtérkép'}}</h1>
   <span>Biztonságos piszkozat · publikálás csak jóváhagyás után</span></header>
  <div *ngIf="error" role="alert" class="alert">{{error}}</div>
  <div *ngIf="notice" role="status" class="notice">{{notice}}</div>
  <form (ngSubmit)="save()" #f="ngForm" *ngIf="ready">
   <section><h2>Alapadatok</h2>
    <label>Szervezet
     <select name="org" [(ngModel)]="form.organizationId" required [disabled]="!!id">
      <option value="">Válassz szervezetet</option><option *ngFor="let org of organizations" [value]="org.id">{{org.name}}</option>
     </select>
    </label>
    <label>Térkép címe<input name="title" [(ngModel)]="form.branding.title" minlength="2" maxlength="100" required/></label>
    <label>Nyilvános URL azonosító<input name="slug" [(ngModel)]="form.slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" required/></label>
    <label>Arculati szín<input type="color" name="color" [(ngModel)]="form.branding.accentColor" required/></label>
    <label>Logó URL (HTTPS, opcionális)<input name="logo" [(ngModel)]="logo" placeholder="https://..." /></label>
   </section>
   <section><h2>Térkép kezdőnézete</h2>
    <div class="two"><label>Hosszúság<input name="lng" type="number" step="any" min="-180" max="180" [(ngModel)]="form.map.center[0]" required/></label>
    <label>Szélesség<input name="lat" type="number" step="any" min="-90" max="90" [(ngModel)]="form.map.center[1]" required/></label></div>
    <label>Nagyítás (0–20)<input name="zoom" type="number" step="0.5" min="0" max="20" [(ngModel)]="form.map.zoom" required/></label>
   </section>
   <section><h2>Kategóriák</h2>
    <div class="chips"><label *ngFor="let c of availableCategories"><input type="checkbox" [checked]="form.categories.includes(c.id)" (change)="toggleCategory(c.id,$event)"/>{{c.label}}</label></div>
   </section>
   <section><h2>Helyszínek és események kiválasztása</h2>
    <p>Keress a térkép középpontjának környékén. A találatokat hozzáadhatod a vendégtérképedhez.</p>
    <div class="two"><label>Keresés<input name="catalogSearch" [(ngModel)]="catalogSearch" placeholder="Helyszín neve"/></label>
    <label>Típus<select name="catalogKind" [(ngModel)]="catalogKind"><option value="poi">Helyszínek</option><option value="event">Események</option></select></label></div>
    <div class="actions"><button type="button" (click)="searchCatalog()" [disabled]="searching">{{searching?'Keresés…':'Keresés a környéken'}}</button><span>30 km-es körzet</span></div>
    <div class="catalog-layout">
     <div class="catalog-list">
      <div *ngFor="let place of catalogResults" class="catalog-row"><div><strong>{{place.title}}</strong><small>{{place.category}} · {{place.address || 'Helyszín'}}</small></div>
       <button type="button" (click)="togglePlace(place)">{{isSelected(place)?'Eltávolítás':'+ Hozzáadás'}}</button></div>
      <p *ngIf="!catalogResults.length">A találatok itt jelennek meg.</p>
     </div>
     <div class="map-preview"><div #catalogMap class="map-canvas" aria-label="Helyszínek térképe"></div></div>
    </div>
    <p>Kiválasztva: {{form.poiIds.length}} helyszín és {{form.eventIds.length}} esemény.</p>
    <details><summary>Haladó: azonosítók szerkesztése</summary>
      <label>POI UUID-k<textarea name="pois" [(ngModel)]="poiText" rows="3"></textarea></label>
      <label>Esemény UUID-k<textarea name="events" [(ngModel)]="eventText" rows="3"></textarea></label>
    </details>
   </section>
   <div class="actions"><button type="submit" [disabled]="busy||!f.valid||form.published">{{busy?'Mentés…':'Piszkozat mentése'}}</button><span *ngIf="form.published">Publikált térkép nem módosítható ezen a felületen.</span></div>
  </form>
 </main>`,
 styles:[`
 :host{display:block;min-height:100vh;background:#101a14;color:#edf5ee;font-family:inherit}
 .editor{max-width:900px;margin:auto;padding:35px 20px 80px}.editor>a{color:#bde9b7}header{margin:30px 0}header p{color:#9bbca3;letter-spacing:2px;font-size:12px}h1{font-size:clamp(30px,5vw,48px);margin:8px 0}header span,section p{color:#aabfb0}
 section{background:#19271d;border:1px solid #38513e;border-radius:16px;padding:24px;margin:18px 0}h2{margin:0 0 20px}
 label{display:block;margin:14px 0;color:#d1e1d2;font-size:14px}
 input:not([type=checkbox]),select,textarea{box-sizing:border-box;width:100%;background:#0f1a13;color:white;border:1px solid #506c55;border-radius:8px;padding:12px;margin-top:7px;font:inherit}
 input[type=color]{height:52px}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
 .catalog-layout{display:grid;grid-template-columns:1fr 1.3fr;gap:14px;margin-top:16px}
 .catalog-list{max-height:380px;overflow:auto}.catalog-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;border-bottom:1px solid #3a5340}
 .catalog-row small{display:block;color:#a5bda9;margin-top:5px}.catalog-row button{padding:9px;font-size:12px}
 .map-canvas{height:380px;border-radius:12px;overflow:hidden}.map-preview{min-width:0}
 @media(max-width:700px){.catalog-layout{grid-template-columns:1fr}.catalog-list{max-height:220px}}
 .chips{display:flex;flex-wrap:wrap;gap:12px}.chips label{padding:10px;border:1px solid #4a634e;border-radius:8px;display:flex;gap:8px}
 button{background:#c4f1b6;color:#102115;padding:14px 24px;border:0;border-radius:9px;font-weight:700;cursor:pointer}
 button:disabled{opacity:.5}.actions{display:flex;align-items:center;gap:18px}.alert,.notice{padding:15px;border-radius:9px;background:#522b2b}.notice{background:#244c2b}
 @media(max-width:600px){.two{grid-template-columns:1fr}.actions{flex-wrap:wrap}}
 `]
})
export class GuideEditorComponent implements OnInit, AfterViewChecked, OnDestroy {
 @ViewChild('catalogMap') catalogMap?:ElementRef<HTMLDivElement>;
 private map?:maplibregl.Map;
 private markers:maplibregl.Marker[]=[];
 catalogResults:CatalogPlace[]=[];
 catalogSearch='';catalogKind:'poi'|'event'='poi';searching=false;
 vertical='hotel';id='';ready=false;busy=false;error='';notice='';token='';logo='';poiText='';eventText='';
 organizations:{id:string;name:string;businessType:string;role:string}[]=[];
 availableCategories=[
 {id:'attraction',label:'Látnivaló'},{id:'restaurant',label:'Étterem'},{id:'accommodation',label:'Szállás'},
 {id:'nature',label:'Természet'},{id:'museum',label:'Múzeum'},{id:'culture',label:'Kultúra'},
 {id:'event',label:'Esemény'},{id:'other',label:'Egyéb'}];
 form:GuideForm={organizationId:'',slug:'',branding:{title:'',accentColor:'#67c58c'},
 map:{center:[19.04,47.5],zoom:12},categories:['attraction'],poiIds:[],eventIds:[],published:false};
 constructor(private route:ActivatedRoute,private router:Router,private session:AccessSessionService){}
 async ngOnInit(){
  this.vertical=this.route.snapshot.paramMap.get('vertical')||'hotel';
  this.id=this.route.snapshot.paramMap.get('id')||'';
  if(!TYPES.includes(this.vertical)){this.error='Érvénytelen munkaterület';return;}
  if(!this.session.token || this.session.identity?.role!=='partner'){
   this.error='A szerkesztéshez jelentkezz be a partner munkaterületen.';return;
  }
  try{
   const orgs=await this.session.request('/api/access/organizations');
   this.organizations=(orgs as typeof this.organizations).filter(o=>o.businessType===this.vertical && (o.role==='owner'||o.role==='editor'));
   if(this.id){
    const data:GuideForm=await this.session.request('/api/partner/guides/'+encodeURIComponent(this.id));
    if(!this.organizations.some(o=>o.id===data.organizationId))throw Error('Nincs jogosultság ehhez a munkaterülethez.');
    this.form=data;
    this.logo=data.branding.logoUrl||'';
    this.poiText=data.poiIds.join('\n');
    this.eventText=data.eventIds.join('\n');
   }else if(this.organizations.length){this.form.organizationId=this.organizations[0].id;}
   this.ready=true;
  }catch(e){this.error=e instanceof Error?e.message:'Betöltési hiba';}
 }
 ngAfterViewChecked(){
  if(!this.map&&this.catalogMap&&this.ready){
   this.map=new maplibregl.Map({container:this.catalogMap.nativeElement,style:MAP_STYLE,center:this.form.map.center,zoom:this.form.map.zoom});
   this.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
   this.map.on('moveend',()=>{
    if(this.map){const center=this.map.getCenter();this.form.map.center=[Number(center.lng.toFixed(5)),Number(center.lat.toFixed(5))];this.form.map.zoom=Number(this.map.getZoom().toFixed(1));}
   });
  }
 }
 ngOnDestroy(){this.markers.forEach(m=>m.remove());this.map?.remove();}
 isSelected(place:CatalogPlace){return (place.kind==='poi'?this.form.poiIds:this.form.eventIds).includes(place.id);}
 togglePlace(place:CatalogPlace){
  const ids=place.kind==='poi'?this.form.poiIds:this.form.eventIds;
  const next=ids.includes(place.id)?ids.filter(id=>id!==place.id):[...ids,place.id];
  if(next.length>250){this.error='Legfeljebb 250 elem választható típusonként.';return;}
  if(place.kind==='poi'){this.form.poiIds=next;this.poiText=next.join('\n');}
  else {this.form.eventIds=next;this.eventText=next.join('\n');}
  this.drawCatalogMarkers();
 }
 async searchCatalog(){
  this.searching=true;this.error='';
  try{
   const query=new URLSearchParams({kind:this.catalogKind,q:this.catalogSearch,lng:String(this.form.map.center[0]),
    lat:String(this.form.map.center[1]),radiusKm:'30',limit:'40'});
   const response:{items:CatalogPlace[]}=await this.session.request('/api/partner/catalog?'+query.toString());
   this.catalogResults=response.items;this.drawCatalogMarkers();
  }catch(e){this.error=e instanceof Error?e.message:'A keresés sikertelen.';}
  finally{this.searching=false;}
 }
 private drawCatalogMarkers(){
  this.markers.forEach(m=>m.remove());this.markers=[];
  if(!this.map)return;
  for(const place of this.catalogResults){
   const node=document.createElement('button');node.type='button';node.textContent=this.isSelected(place)?'✓':'+';
   node.setAttribute('aria-label',place.title);
   node.style.cssText='width:30px;height:30px;border-radius:50%;background:#287d59;color:white;border:2px solid white;cursor:pointer';
   node.addEventListener('click',()=>this.togglePlace(place));
   this.markers.push(new maplibregl.Marker({element:node}).setLngLat(place.coordinates).addTo(this.map));
  }
 }
 toggleCategory(category:string,event:Event){
  const checked=(event.target as HTMLInputElement).checked;
  this.form.categories=checked?[...this.form.categories,category]:this.form.categories.filter(x=>x!==category);
 }
 async save(){
  this.busy=true;this.error='';this.notice='';
  try{
   const parseIds=(raw:string)=>raw.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);
   const body:GuideForm={...this.form,
    branding:{...this.form.branding,...(this.logo.trim()?{logoUrl:this.logo.trim()}:{})},
    poiIds:parseIds(this.poiText),eventIds:parseIds(this.eventText),published:false};
   if(!this.organizations.some(o=>o.id===body.organizationId))throw Error('Nincs jogosultság ehhez a szervezethez.');
   const result=await this.session.request(
    '/api/partner/guides'+(this.id?'/'+encodeURIComponent(this.id):''),
    this.id?'PUT':'POST',body);
   this.notice='Piszkozat sikeresen mentve.';
   if(!this.id){this.id=result.id;await this.router.navigate(['/access',this.vertical,'guides',this.id]);}
  }catch(e){this.error=e instanceof Error?e.message:'A mentés sikertelen.';}
  finally{this.busy=false;}
 }
}
