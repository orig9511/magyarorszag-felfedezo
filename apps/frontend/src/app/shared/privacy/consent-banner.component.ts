import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConsentService } from '../../core/privacy/consent.service';
@Component({
 selector:'app-consent-banner',standalone:true,imports:[CommonModule,RouterLink,FormsModule],
 template:`
 <section *ngIf="!consent.decided || settingsOpen" class="consent" aria-label="Adatvédelmi beállítások">
  <div class="copy"><strong>Adatvédelem és sütik</strong>
   <p>Az oldal működéséhez szükséges helyi tárolást használhatunk. Az analitikai és hirdetési célú technológiák jelenleg nincsenek bekapcsolva. A későbbi opcionális funkciókhoz külön hozzájárulást kérünk.</p>
   <a routerLink="/adatvedelem">Adatkezelési tájékoztató</a> · <a routerLink="/sutik">Sütikezelés</a>
  </div>
  <div class="controls" *ngIf="!settingsOpen">
   <button type="button" (click)="choose(false,false)">Elutasítom</button>
   <button type="button" (click)="settingsOpen=true">Beállítások</button>
   <button type="button" class="primary" (click)="choose(true,true)">Elfogadom</button>
  </div>
  <div class="controls" *ngIf="settingsOpen">
   <label><input type="checkbox" checked disabled/> Szükséges (mindig aktív)</label>
   <label><input type="checkbox" [(ngModel)]="analytics"/> Analitika</label>
   <label><input type="checkbox" [(ngModel)]="marketing"/> Hirdetés</label>
   <button type="button" class="primary" (click)="choose(analytics,marketing)">Mentés</button>
  </div>
 </section>
 <button *ngIf="consent.decided && !settingsOpen" class="privacy-trigger" type="button" (click)="openSettings()">Sütibeállítások</button>
 `,
 styles:[`
 .consent{position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;max-width:950px;margin:auto;background:#17251c;border:1px solid #5a735f;border-radius:14px;box-shadow:0 18px 70px #0009;color:#f4f7f2;padding:18px;display:flex;gap:20px;align-items:center;font-family:inherit}
 .copy{flex:1}.copy strong{font-size:1rem}.copy p{font-size:.85rem;line-height:1.5;margin:6px 0;color:#d0ded0}.copy a{color:#c5e9bd;font-size:.83rem}
 .controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.controls button{cursor:pointer;border:1px solid #66836b;background:#283b2d;color:white;border-radius:8px;padding:10px 12px}.controls .primary{background:#c3eeb8;color:#142019}
 .controls label{font-size:.83rem;white-space:nowrap}.privacy-trigger{position:fixed;bottom:8px;left:8px;z-index:9998;border:1px solid #66836b;background:#17251c;color:#e6f0e4;padding:7px 10px;border-radius:8px;font-size:.72rem;cursor:pointer}
 @media(max-width:720px){.consent{display:block;bottom:8px;left:8px;right:8px;padding:14px}.controls{margin-top:12px}.controls button{flex:1}.privacy-trigger{font-size:.65rem}}
 `]
})
export class ConsentBannerComponent {
 settingsOpen=false;analytics=false;marketing=false;
 constructor(public readonly consent:ConsentService){}
 openSettings(){this.analytics=this.consent.analyticsAllowed;this.marketing=this.consent.marketingAllowed;this.settingsOpen=true;}
 choose(analytics:boolean,marketing:boolean){this.consent.save(analytics,marketing);this.settingsOpen=false;}
}
