import { Injectable } from '@angular/core';
export interface SessionIdentity {id:string;email:string;role:'admin'|'partner';status:string;}
@Injectable({providedIn:'root'})
export class AccessSessionService {
 private bearer='';
 identity?:SessionIdentity;
 get token(){return this.bearer;}
 setSession(token:string,identity:SessionIdentity){
  if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Invalid session');
  this.bearer=token;this.identity=identity;
 }
 clear(){this.bearer='';this.identity=undefined;}
 async request(path:string,method='GET',body?:unknown):Promise<any>{
  const res=await fetch(path,{method,headers:{'Content-Type':'application/json',...(this.bearer?{Authorization:'Bearer '+this.bearer}:{})},
   ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(typeof data.message==='string'?data.message:'A művelet nem sikerült.');
  return data;
 }
}
