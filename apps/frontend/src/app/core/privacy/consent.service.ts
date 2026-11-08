import { Injectable } from '@angular/core';
export interface ConsentChoice { analytics:boolean; marketing:boolean; updatedAt:string; version:1; }
const KEY='momap-privacy-choice-v1';
@Injectable({providedIn:'root'})
export class ConsentService {
 private read():ConsentChoice|null {
  try { const value=localStorage.getItem(KEY);if(!value)return null;
   const data=JSON.parse(value) as ConsentChoice;
   return data.version===1&&typeof data.analytics==='boolean'&&typeof data.marketing==='boolean'?data:null;
  }catch{return null;}
 }
 choice:ConsentChoice|null=this.read();
 get decided(){return this.choice!==null;}
 save(analytics:boolean,marketing:boolean){
  this.choice={analytics,marketing,updatedAt:new Date().toISOString(),version:1};
  try{localStorage.setItem(KEY,JSON.stringify(this.choice));}catch{}
  // No third-party SDKs are initialized here. Consent must be checked by any future adapter.
 }
 get analyticsAllowed(){return this.choice?.analytics===true;}
 get marketingAllowed(){return this.choice?.marketing===true;}
}
