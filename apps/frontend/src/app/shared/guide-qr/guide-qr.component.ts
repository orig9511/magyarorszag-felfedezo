import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import QRCode from 'qrcode';

/** Local QR generation only. No link is submitted to a remote QR service. */
@Component({
 selector:'app-guide-qr',standalone:true,imports:[CommonModule],
 template:`
 <section class="qr" *ngIf="url" aria-label="Vendégtérkép QR-kódja">
  <h3>Vendégtérkép QR-kód</h3>
  <p>A kódot a vendégek telefonnal beolvashatják. Csak publikált, nyilvános térképhez használd.</p>
  <img *ngIf="dataUrl" [src]="dataUrl" alt="A vendégtérkép hivatkozását tartalmazó QR-kód" width="220" height="220"/>
  <p *ngIf="error" role="alert">{{error}}</p>
  <button type="button" [disabled]="!dataUrl" (click)="download()">QR-kód mentése (PNG)</button>
 </section>`,
 styles:[`
 .qr{border:1px solid #4d6652;background:#1b2c21;padding:20px;border-radius:12px;margin:20px 0;max-width:410px;color:#f1f6ed}
 .qr h3{margin:0 0 8px;font-size:1.2rem}.qr p{color:#c1d2c1;font-size:.87rem;line-height:1.5}
 .qr img{display:block;margin:14px 0;border:8px solid #fff;border-radius:8px;background:white;max-width:100%;height:auto}
 .qr button{background:#c5efb8;color:#172719;border:0;border-radius:8px;padding:11px 15px;font-weight:700;cursor:pointer}
 .qr button:disabled{opacity:.5;cursor:not-allowed}
 `]
})
export class GuideQrComponent implements OnChanges {
 @Input() url='';
 @Input() filename='momap-vendegterkep';
 dataUrl='';error='';
 async ngOnChanges():Promise<void>{
  this.dataUrl='';this.error='';
  if(!this.url)return;
  try {
   const target=new URL(this.url);
   if(!['https:','http:'].includes(target.protocol))throw new Error('Invalid URL');
   this.dataUrl=await QRCode.toDataURL(target.href,{errorCorrectionLevel:'M',width:800,margin:3,color:{dark:'#172719',light:'#FFFFFF'}});
  }catch{this.error='A QR-kód létrehozása nem sikerült.';}
 }
 download():void {
  if(!this.dataUrl)return;
  const a=document.createElement('a');a.href=this.dataUrl;
  a.download=(this.filename.replace(/[^a-z0-9-_]/gi,'-').slice(0,70)||'momap-vendegterkep')+'.png';
  a.click();
 }
}
