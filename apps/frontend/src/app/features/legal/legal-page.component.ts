import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({
 selector:'app-legal-page',standalone:true,imports:[CommonModule,RouterLink],
 template:`
 <main class="legal">
 <a routerLink="/">← Momap főoldal</a>
 <ng-container [ngSwitch]="kind">
  <section *ngSwitchCase="'privacy'"><h1>Adatkezelési tájékoztató – előzetes tervezet</h1>
   <p><strong>Fontos:</strong> Ez a dokumentum még nem végleges. Az adatkezelő hivatalos azonosító adatait és elérhetőségét a nyilvános indulás előtt kötelező kitölteni.</p>
   <h2>Adatkezelő</h2><p>Az adatkezelő neve, székhelye, kapcsolattartási e-mail-címe és szükség esetén képviselője: <strong>közzététel előtt kitöltendő</strong>.</p>
   <h2>Adatkezelési célok</h2><p>A térképes böngészéshez szükséges technikai működés; partnerregisztráció és hozzáférés-kezelés; a partnerek által összeállított vendégtérképek kezelése; visszaélések elleni védelem.</p>
   <h2>Adatkategóriák és jogalapok</h2><p>A partneri fiókokhoz e-mail-cím, hitelesítési adatok, szervezeti és jogosultsági információk kapcsolódhatnak. A szerződés teljesítése, jogos érdek vagy jogi kötelezettség lehet alkalmazandó, a konkrét folyamat függvényében. A nem szükséges analitikai és marketingtechnológiák csak megfelelő hozzájárulással aktiválhatók.</p>
   <h2>Megőrzés és adattovábbítás</h2><p>A pontos megőrzési idők, tárhelyszolgáltatók, adatfeldolgozók, adattovábbítások és harmadik országbeli garanciák a tényleges üzemeltetési konfiguráció alapján, indulás előtt rögzítendők.</p>
   <h2>Érintetti jogok</h2><p>Az alkalmazandó jogszabályok szerint hozzáférés, helyesbítés, törlés, korlátozás, adathordozhatóság, tiltakozás és a hozzájárulás visszavonása kérhető. Panasz az illetékes adatvédelmi felügyeleti hatóságnál tehető.</p>
   <h2>Adatforrások</h2><p>A térképes adatok nyilvános, megfelelően licencelt forrásokból és partneri közlésekből származhatnak. A forrás, licenc és közzétételi jogosultság ellenőrzése szükséges.</p>
  </section>
  <section *ngSwitchCase="'cookies'"><h1>Sütikezelési tájékoztató – előzetes tervezet</h1>
   <p>A Momap jelenlegi előkészítő felülete a látogató adatvédelmi döntését a böngésző helyi tárhelyén tárolhatja <code>momap-privacy-choice-v1</code> kulccsal. Ez nem hirdetési vagy analitikai nyomkövető.</p>
   <h2>Opcionális technológiák</h2><p>A Google AdSense és a webanalitika jelenleg nincs aktiválva. Aktiválásuk előtt a tényleges szolgáltatók, célok, lejárati idők és a megfelelő hozzájáruláskezelés dokumentálandó.</p>
   <h2>Beállítások módosítása</h2><p>A „Sütibeállítások” gombbal bármikor módosítható a választás. A hozzájárulás nem indít automatikusan harmadik féltől származó kódot.</p>
  </section>
  <section *ngSwitchDefault><h1>Jogi információk – kitöltendő</h1>
   <p>A Momap üzemeltetőjének hivatalos neve, címe, vállalkozási adatai, kapcsolattartási lehetőségei és az alkalmazandó ország szerinti kötelező impresszumadatok a nyilvános indulás előtt megadandók.</p>
   <p>Ez az oldal jelenleg előkészítő tervezet, nem teljes jogi impresszum.</p>
  </section>
 </ng-container>
 </main>
 `,
 styles:[`:host{display:block;min-height:100vh;background:#0f1913;color:#edf4ed}.legal{max-width:800px;margin:auto;padding:45px 22px 90px;line-height:1.75}.legal a{color:#c6ecb7}.legal h1{font-size:clamp(1.8rem,5vw,3rem);line-height:1.2}.legal h2{margin-top:2rem}.legal p{color:#c9d6c9}.legal code{color:#c5eab5}`]
})
export class LegalPageComponent{
 get kind(){return this.route.snapshot.data['kind'] as string;}
 constructor(private readonly route:ActivatedRoute){}
}
