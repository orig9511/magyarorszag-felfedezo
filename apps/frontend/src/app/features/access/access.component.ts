import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccessSessionService } from './access-session.service';
type Vertical = 'hotel' | 'restaurant' | 'service';
interface Identity { id:string;email:string;role:'admin'|'partner';status:string; }
interface Organization {id:string;name:string;slug:string;businessType:Vertical;role:string;}
interface Guide {id:string;slug:string;title:string;published:boolean;organization:string;}
interface ModeratedGuide {id:string;slug:string;title:string;published:boolean;organization:string;businessType:string;poiCount:number;eventCount:number;}
interface Pending {id:string;email:string;name:string;businessType:Vertical;createdAt:string;}
@Component({
 selector:'app-access',standalone:true,imports:[CommonModule,FormsModule,RouterLink],
 template:`
 <div class="shell">
  <aside class="sidebar">
   <a routerLink="/" class="logo">◈ Momap <small>Access</small></a>
   <div class="side-label">Munkaterületek</div>
   <a routerLink="/access/admin">Adminisztráció</a>
   <a routerLink="/access/hotel">Szálláshelyek</a>
   <a routerLink="/access/restaurant">Éttermek</a>
   <a routerLink="/access/service">Szolgáltatók</a>
   <div class="side-footer">Momap Business · Pilot</div>
  </aside>
  <main>
   <header><div><p class="eyebrow">MOMAP / ACCESS</p><h1>{{ heading }}</h1><p class="subtitle">{{ subheading }}</p></div><button *ngIf="identity" class="ghost" (click)="logout()">Kijelentkezés</button></header>
   <div *ngIf="error" class="alert" role="alert">{{error}}</div>
   <div *ngIf="notice" class="success" role="status">{{notice}}</div>
   <section *ngIf="!identity" class="auth-card">
    <div class="tabs"><button [class.active]="mode==='login'" (click)="mode='login'">Bejelentkezés</button><button *ngIf="vertical!=='admin'" [class.active]="mode==='register'" (click)="mode='register'">Regisztráció</button></div>
    <form (ngSubmit)="submit()" #f="ngForm">
     <ng-container *ngIf="mode==='register' && vertical!=='admin'">
      <label>Vállalkozás neve<input name="name" [(ngModel)]="form.name" required minlength="2" maxlength="160" autocomplete="organization"/></label>
      <label>Vállalkozás azonosítója (URL)<input name="slug" [(ngModel)]="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="pelda-hotel"/></label>
     </ng-container>
     <label>E-mail-cím<input name="email" [(ngModel)]="form.email" type="email" required autocomplete="username"/></label>
     <label>Jelszó<input name="password" [(ngModel)]="form.password" type="password" required [minlength]="mode==='register'?12:1" maxlength="128" [autocomplete]="mode==='register'?'new-password':'current-password'"/></label>
     <button class="primary" [disabled]="busy || !f.valid">{{busy?'Feldolgozás…':mode==='register'?'Regisztráció elküldése':'Belépés'}}</button>
    </form>
    <p class="hint" *ngIf="mode==='register'">A regisztráció adminisztrátori jóváhagyás után válik aktívvá.</p>
   </section>
   <ng-container *ngIf="identity">
    <div class="identity"><span class="dot"></span>{{identity.email}} <span class="pill">{{identity.role==='admin'?'Platform admin':'Partner'}}</span></div>
    <ng-container *ngIf="vertical==='admin'">
     <div class="section-head"><h2>Jóváhagyásra váró partnerek</h2><button class="ghost" (click)="refresh()">Frissítés</button></div>
     <div class="empty" *ngIf="!pending.length">Nincs függőben lévő regisztráció.</div>
     <div class="item" *ngFor="let p of pending"><div><strong>{{p.name || p.email}}</strong><p>{{p.email}} · {{typeLabel(p.businessType)}}</p></div><div class="actions"><button (click)="decide(p.id,true)">Jóváhagyás</button><button class="danger" (click)="decide(p.id,false)">Elutasítás</button></div></div>
     <div class="section-head"><h2>Vendégtérképek moderálása</h2><span class="muted">Csak ellenőrzött tartalmat publikálj</span></div>
     <div class="item" *ngFor="let guide of moderatedGuides">
      <div><strong>{{guide.title}}</strong><p>{{guide.organization}} · {{guide.slug}} · {{guide.poiCount}} helyszín · {{guide.eventCount}} esemény</p></div>
      <div class="actions"><span class="pill">{{guide.published?'Publikált':'Piszkozat'}}</span>
       <button *ngIf="!guide.published" (click)="publishGuide(guide,true)">Publikálás</button>
       <button *ngIf="guide.published" class="danger" (click)="publishGuide(guide,false)">Visszavonás</button>
      </div>
     </div>
     <div class="empty" *ngIf="!moderatedGuides.length">Még nincs vendégtérkép.</div>
    </ng-container>
    <ng-container *ngIf="vertical!=='admin'">
     <div class="stats"><article><span>Szervezetek</span><strong>{{organizations.length}}</strong></article><article><span>Vendégtérképek</span><strong>{{guides.length}}</strong></article><article><span>Publikált</span><strong>{{publishedCount}}</strong></article></div>
     <div class="section-head"><h2>Saját vállalkozások</h2><button class="ghost" (click)="refresh()">Frissítés</button></div>
     <div class="item" *ngFor="let o of organizations"><div><strong>{{o.name}}</strong><p>{{o.slug}} · {{typeLabel(o.businessType)}} · {{o.role}}</p></div><span class="pill">Aktív hozzáférés</span></div>
     <div class="empty" *ngIf="!organizations.length">Ehhez a munkaterülethez nincs hozzárendelt vállalkozás.</div>
     <div class="section-head"><h2>Vendégtérképek</h2><a [routerLink]="['/access',vertical,'guides','new']">+ Új vendégtérkép</a></div>
     <div class="item" *ngFor="let g of guides"><div><strong>{{g.title}}</strong><p>{{g.organization}} · {{g.slug}}</p></div><a *ngIf="g.published" [routerLink]="['/g',g.slug]">Térkép megnyitása</a><a *ngIf="!g.published" [routerLink]="['/access',vertical,'guides',g.id]">Szerkesztés</a></div>
     <div class="empty" *ngIf="!guides.length">Még nincs vendégtérkép. Hozz létre egy új piszkozatot.</div>
    </ng-container>
   </ng-container>
  </main>
 </div>`,
 styles:[`
 :host{display:block;background:#0d1511;color:#f0f6ef;min-height:100vh;font-family:inherit}
 .shell{display:grid;grid-template-columns:245px minmax(0,1fr);min-height:100vh}
 .sidebar{background:#142119;border-right:1px solid #314336;padding:30px 20px;display:flex;flex-direction:column;gap:10px}
 .logo{font-size:25px;font-weight:800;letter-spacing:-1px;margin-bottom:48px}.logo small{font-size:11px;letter-spacing:2px;color:#a4c9a9;text-transform:uppercase}
 .side-label,.eyebrow{font-size:11px;letter-spacing:2px;color:#9abca0;text-transform:uppercase}
 .sidebar>a:not(.logo){padding:12px;border-radius:10px;color:#d6e5d7;text-decoration:none}.sidebar>a:hover{background:#283a2d}
 .side-footer{margin-top:auto;font-size:12px;color:#91a895}
 main{max-width:1150px;width:100%;padding:50px clamp(20px,5vw,75px);margin:auto}
 header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:38px}
 h1{font-size:clamp(32px,4vw,52px);letter-spacing:-1.5px;margin:8px 0}h2{font-size:22px}
 .subtitle,.muted,.hint{color:#a4b7a6}a{color:#b9e6bd}
 button{border:0;border-radius:9px;padding:12px 18px;background:#c4f1b6;color:#112018;font-weight:700;cursor:pointer}
 button:disabled{opacity:.5;cursor:not-allowed}.ghost{background:transparent;border:1px solid #4a6351;color:#e5f4e5}
 .auth-card{max-width:480px;background:#17251c;border:1px solid #38503e;border-radius:18px;padding:28px}
 .tabs{display:flex;gap:8px;margin-bottom:26px}.tabs button{background:transparent;color:#a5b9a7}.tabs .active{background:#c4f1b6;color:#112018}
 label{display:block;font-size:13px;margin:16px 0;color:#c9dbcb}input{box-sizing:border-box;display:block;width:100%;background:#0e1912;border:1px solid #49614e;border-radius:9px;color:white;padding:13px;margin-top:8px;font-size:15px}
 .primary{width:100%;margin-top:15px}.alert,.success{padding:14px;border-radius:10px;margin:12px 0;background:#4a2525;color:#ffdddd}.success{background:#24452c;color:#d3f5d4}
 .identity{margin:0 0 30px;display:flex;gap:10px;align-items:center;color:#bcd1c0}.dot{width:8px;height:8px;border-radius:50%;background:#bdf1b4}.pill{font-size:12px;border:1px solid #45634b;padding:7px 10px;border-radius:30px;color:#bbd6bd}
 .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:35px}.stats article{background:#19291f;padding:22px;border:1px solid #314a37;border-radius:13px}.stats span{display:block;color:#a6bbaa;font-size:13px}.stats strong{font-size:36px}
 .section-head{display:flex;align-items:center;justify-content:space-between;margin-top:24px}.item{background:#19291f;border:1px solid #314a37;padding:18px 22px;border-radius:12px;margin:10px 0;display:flex;justify-content:space-between;align-items:center;gap:15px}.item p{color:#a4b7a6;margin:7px 0 0;font-size:13px}.actions{display:flex;gap:8px}.danger{background:#472b2b;color:#f5dada}.empty{border:1px dashed #47604c;padding:26px;border-radius:12px;color:#a4b7a6}
 @media(max-width:760px){.shell{display:block}.sidebar{padding:14px;gap:4px;flex-direction:row;flex-wrap:wrap}.sidebar .logo{width:100%;margin:0}.sidebar>a:not(.logo){font-size:12px;padding:7px}.side-label,.side-footer{display:none}main{padding:24px 16px}.stats{gap:8px}.stats article{padding:12px}.stats strong{font-size:25px}.item{flex-wrap:wrap}header{flex-wrap:wrap}}
 `]
})
export class AccessComponent implements OnInit {
 vertical:'admin'|Vertical='hotel';mode:'login'|'register'='login';
 identity?:Identity;organizations:Organization[]=[];guides:Guide[]=[];pending:Pending[]=[];moderatedGuides:ModeratedGuide[]=[];
 error='';notice='';busy=false;
 get token(){return this.session.token;}
 form={email:'',password:'',name:'',slug:''};
 constructor(private route:ActivatedRoute,private router:Router,private session:AccessSessionService){}
 get heading(){return {admin:'Platform adminisztráció',hotel:'Szálláshelyek kezelése',restaurant:'Éttermek kezelése',service:'Szolgáltatói központ'}[this.vertical];}
 get subheading(){return {admin:'Partnerkérelmek és platformfelügyelet',hotel:'Vendégélmények és saját térképek egy helyen',restaurant:'Helyi jelenlét és éttermi információk',service:'Szolgáltatások és helyi ajánlatok kezelése'}[this.vertical];}
 get publishedCount(){return this.guides.filter(g=>g.published).length;}
 typeLabel(t:Vertical){return {hotel:'Szálláshely',restaurant:'Étterem',service:'Szolgáltató'}[t]||t;}
 ngOnInit(){this.route.paramMap.subscribe(params=>{const v=params.get('vertical');this.vertical=v==='admin'||v==='restaurant'||v==='service'?v:'hotel';this.identity=this.session.identity;this.error='';this.notice='';this.mode='login';if(this.identity)this.refresh();});}
 async request(path:string,method='GET',body?:unknown):Promise<any>{
  return this.session.request('/api/access/'+path,method,body);
 }
 async submit(){
  this.error='';this.notice='';this.busy=true;
  try{
   if(this.mode==='register'){
    const data=await this.request('register','POST',{...this.form,businessType:this.vertical});
    this.notice='Regisztráció elküldve. Az adminisztrátor jóváhagyása szükséges.';
    this.mode='login';this.form.password='';return;
   }
   const result=await this.request('login','POST',{email:this.form.email,password:this.form.password});
   this.form.password='';
   this.session.setSession(result.token,result.identity);this.identity=result.identity;
   if((this.vertical==='admin')!==(this.identity?.role==='admin')){this.logout();this.error='Ehhez a munkaterülethez nincs jogosultságod.';return;}
   await this.refresh();
  }catch(e){this.error=e instanceof Error?e.message:'Hiba történt.';}finally{this.busy=false;}
 }
 async refresh(){
  if(!this.identity)return;
  try{
   if(this.vertical==='admin'){const [pending,guides]=await Promise.all([this.request('admin/pending'),this.request('admin/guides')]);this.pending=pending;this.moderatedGuides=guides;return;}
   const [orgs,guides]=await Promise.all([this.request('organizations'),this.request('guides')]);
   this.organizations=(orgs as Organization[]).filter(o=>o.businessType===this.vertical);
   const allowed=new Set(this.organizations.map(o=>o.id));
   this.guides=(guides as (Guide & {organizationId:string})[]).filter(g=>allowed.has(g.organizationId));
  }catch(e){this.error=e instanceof Error?e.message:'Nem sikerült betölteni az adatokat.';}
 }
 async decide(id:string,approve:boolean){
  try{await this.request('admin/'+id+'/'+(approve?'approve':'reject'),'POST');this.notice=approve?'Partner jóváhagyva.':'Kérelem elutasítva.';await this.refresh();}
  catch(e){this.error=e instanceof Error?e.message:'Hiba történt.';}
 }
 async publishGuide(guide:ModeratedGuide,publish:boolean){
  if(!confirm(publish?'Ellenőrizted a helyszínek forrását és a felhasználási jogokat? Publikálod a térképet?':'Visszavonod a nyilvános térképet?'))return;
  this.error='';this.notice='';
  try{
   await this.request('admin/guides/'+guide.id+'/'+(publish?'publish':'unpublish'),'POST');
   this.notice=publish?'A térkép publikálva.':'A térkép visszavonva.';
   await this.refresh();
  }catch(e){this.error=e instanceof Error?e.message:'Sikertelen művelet.';}
 }
 async logout(){
  try{if(this.token)await this.request('logout','POST');}catch{}
  this.identity=undefined;this.session.clear();this.organizations=[];this.guides=[];this.pending=[];
 }
}
