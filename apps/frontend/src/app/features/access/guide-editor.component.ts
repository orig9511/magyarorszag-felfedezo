import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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
   <section><h2>Kiválasztott helyszínek és események</h2>
    <p>Azonosítók soronként (UUID). A helyszínválasztó és térképi előnézet külön fejlesztés.</p>
    <label>POI azonosítók<textarea name="pois" [(ngModel)]="poiText" rows="4" placeholder="Egy UUID soronként"></textarea></label>
    <label>Eseményazonosítók<textarea name="events" [(ngModel)]="eventText" rows="4" placeholder="Egy UUID soronként"></textarea></label>
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
 .chips{display:flex;flex-wrap:wrap;gap:12px}.chips label{padding:10px;border:1px solid #4a634e;border-radius:8px;display:flex;gap:8px}
 button{background:#c4f1b6;color:#102115;padding:14px 24px;border:0;border-radius:9px;font-weight:700;cursor:pointer}
 button:disabled{opacity:.5}.actions{display:flex;align-items:center;gap:18px}.alert,.notice{padding:15px;border-radius:9px;background:#522b2b}.notice{background:#244c2b}
 @media(max-width:600px){.two{grid-template-columns:1fr}.actions{flex-wrap:wrap}}
 `]
})
export class GuideEditorComponent implements OnInit {
 vertical='hotel';id='';ready=false;busy=false;error='';notice='';token='';logo='';poiText='';eventText='';
 organizations:{id:string;name:string;businessType:string;role:string}[]=[];
 availableCategories=[
 {id:'attraction',label:'Látnivaló'},{id:'restaurant',label:'Étterem'},{id:'accommodation',label:'Szállás'},
 {id:'nature',label:'Természet'},{id:'museum',label:'Múzeum'},{id:'culture',label:'Kultúra'},
 {id:'event',label:'Esemény'},{id:'other',label:'Egyéb'}];
 form:GuideForm={organizationId:'',slug:'',branding:{title:'',accentColor:'#67c58c'},
 map:{center:[19.04,47.5],zoom:12},categories:['attraction'],poiIds:[],eventIds:[],published:false};
 constructor(private route:ActivatedRoute,private router:Router){}
 async ngOnInit(){
  this.vertical=this.route.snapshot.paramMap.get('vertical')||'hotel';
  this.id=this.route.snapshot.paramMap.get('id')||'';
  if(!TYPES.includes(this.vertical)){this.error='Érvénytelen munkaterület';return;}
  // AccessComponent intentionally keeps sessions in memory. This editor therefore
  // requires an explicit re-authentication token flow before it can be used.
  this.error='A szerkesztő felülete elkészült, de a munkamenet átadása még nincs bekötve. A szerkesztés jelenleg le van tiltva.';
 }
 toggleCategory(category:string,event:Event){
  const checked=(event.target as HTMLInputElement).checked;
  this.form.categories=checked?[...this.form.categories,category]:this.form.categories.filter(x=>x!==category);
 }
 async save(){
  // Deliberately disabled until secure session handoff is implemented.
  this.error='A mentés még nem engedélyezett ezen a felületen.';
 }
}
