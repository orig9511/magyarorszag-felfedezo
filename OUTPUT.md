# MOMAP – MAP-REFINE-001

Dátum: 2026-10-15. Branch: feature/initial-implementation. Kiinduló HEAD: 6fa83bbdd538f5589dfca2cd4642a43b63ec0fee.
**Státusz: PARTIAL – frontend-javítások és automatizált ellenőrzések elkészültek; browser/AT/touch elfogadás és a hibás event API külön nyitott feladat.**

## Eredmény

- A POI-k és az események külön kérést, cache-t és loading/error állapotot kaptak. A dátumváltás csak az eseményeket érinti, a folyamatban lévő POI-kérést sem szakítja meg. A POI saját válaszakor megjelenhet, nem kell az event API-ra várnia. Places-only módban a dátumkontroll rejtve marad.
- Kategóriánként eltérő színű és meglévő Lucide ikonnal ellátott, pin alakú natív térképgombok készültek. Egy közös palettát használ a marker, a jelmagyarázat, a popup és a kiválasztott kártya. Hover/focus skálázás és tooltip, aria-label/pressed/haspopup, kijelölt állapot, koordinátához kötött auto-anchor popup, egykoppintásos mobilos kiválasztás és számozott klasztergombok.
- A hibás maszképítés helyett a teljes county poligonok uniója után világ-minus-ország különbség készül. A valódi belső gyűrűk és szigetek megmaradnak; nem töröltünk/egyszerűsítettünk el legitím földrajzot. A bemenet klónozott, az API- vagy DB-adat nem módosul.
- A teljes találatrészletek a sidebarba kerültek, hogy a popup ne egy fix sarokpanel mögött jelenjen meg. Kompakt, 20–27 rem asztali panel; mobil map/list mód megmarad. Olvasható, összecsukható kategória-jelmagyarázat. A county intro külön jelzi a módot, töltést, API-hibát és a szűrt nézetben hiányzó adatot; nincs kitalált leírás vagy kép.
- Megmaradt a locked overview, az animált selection és reduced-motion, a free roam, a 400 ms nyugalmi idő és azonnali kérésmegszakítás, az országos fallback hiánya, a stabil kind:id azonosítás és a közös térkép/lista halmaz.

## Diagnózis és bizonyítékok

Részletes reprodukció, elsődleges források, licencellenőrzés és korlátok: **docs/research/MAP-REFINE-001-findings.md**.

**VERIFIED:** javítás előtt a meglévő 19 teszt sikeres volt; az új tesztek kimutatták a POI/event közös várakozását, a dátumváltás felesleges POI-kérését, a Places-only dátumváltoztatás által kiváltott újrakérést és a maszk belső gyűrűvesztését. Javítás után a 35 teszt mind sikeres.

**VERIFIED élő GET:** a POI viewport dátum nélkül 200 és 202 rekord; event viewport days=7 és days=1 esetén egyaránt 400, a query számkonverzió hiánya miatt. A POI API nem fogadott dátumot. **INFERRED:** a frontend közös válaszvárakozása/újrakérése okozhatta a jelentett dátumfüggés látszatát. **UNVERIFIED:** a felhasználó konkrét browser-látványának teljes reprodukciója; nem állítjuk, hogy kizárólag ez az ok.

**VERIFIED maszkadat:** 20 megjelenített régió, 20 poligon, 21 gyűrű, ebből 1 belső gyűrű; zárt és véges koordináták. Új maszk: 2 poligon; Budapest ellenőrzött pontja nincs sötétítve, Bécsé sötétített. Egyetlen Node-mérésben az egyszeri maszképítés ~436 ms. Nem történik pan/zoom frame-enként; mobilos teljesítmény külön mérendő. A hibás topológia javítása ellenőrzött; a sötét pixel-artifact browser/GPU eltűnése még UNVERIFIED.

## Módosított és új fájlok

- apps/frontend/src/app/features/explore/explore.component.ts – külön forrásstreamek/cache, palette, popup/lista és intro-állapotok.
- apps/frontend/src/app/features/explore/explore.component.html – dátum/loading, sidebar részletek, közös színek, legend.
- apps/frontend/src/app/features/explore/explore.component.scss – sidebar/reszponzív/legend/selected megjelenés.
- apps/frontend/src/app/core/services/map.service.ts – új mask helper és pin renderer integráció; MapLibre clustering megmarad.
- apps/frontend/src/app/core/services/country-mask.ts – új teljes Polygon/MultiPolygon unió/különbség és validáció.
- apps/frontend/src/app/core/services/map-pins.ts – új látható, kulcs alapján újrahasznosított pin/cluster gombok, biztonságos DOM popup, fókusz és lifecycle.
- apps/frontend/src/app/core/config/category-visuals.ts – egyetlen kategória szín/ikon/név táblázat.
- apps/frontend/src/styles.scss – MapLibre által létrehozott pin/tooltip/popup stílusok.
- apps/frontend/tests/discovery.test.cjs – 35 tényleges TS-osztály/geometry/DOM-adapter regressziós teszt.
- apps/frontend/package.json, package-lock.json – polygon-clipping 0.15.7 és két új futásidejű függőség; meglévő backend-lockbejegyzések változatlanok.
- apps/frontend/src/assets/licenses/polygon-clipping-notices.txt – tényleges MIT/Unlicense szövegek megőrzése; production assetben jelen van.
- docs/research/MAP-REFINE-001-findings.md, docs/outputs/BACKEND-CONFIG-001.md, To-do.md, OUTPUT.md – bizonyítékok, archívum és státusz.

## Végrehajtott ellenőrzések

1. **PASS:** node --test apps/frontend/tests/discovery.test.cjs – 35/35. Az eredeti 19 ellenőrzés továbbra is PASS. Újak: lassú event mellett POI, date-only újrakérés/cancel kizárása, topo unió/hole/island/winding, közös színek és kontraszt, button/ARIA/tooltip/focus/selected, auto-anchor és kattintás, biztonságos textContent, régi popup és cluster válasz izolációja, bemenet változatlansága.
2. **PASS:** node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/frontend/tsconfig.app.json.
3. **PASS:** npm.cmd run build -w apps/frontend – végső hash 98fc25ccbc3b9ac9. Initial: 343,85 kB raw; explorer lazy: 886,39 kB raw, becsült transfer 201,67 kB. Ez nem FPS-mérés. Megmaradt figyelmeztetések: két korábbi unused komponens, MapLibre CommonJS optimalizálás. A licence-notices asset ténylegesen bekerült a dist/assets/licenses alá.
4. **PASS:** mockolt source 200 látható rekordjának ismételt syncje 200 Marker-allokációnál marad; tile-duplikátum és offscreen elem nem ad új gombot. Ez az allokáció/újrahasználat bizonyítéka, nem élő browser/GPU benchmark.
5. **PASS:** git diff --check; csak LF/CRLF figyelmeztetések. git diff --name-only -- apps/backend scripts üres; backend/ingestion/schema nem módosult.

A DOM/MapLibre tesztadapter nem browser: **UNVERIFIED** a CSS-pixelkép, valós Enter/Space/touch eseménygenerálás, képernyőolvasó, tényleges MapLibre source-tile/WebGL render, popup széli horgonyzás és mobilos FPS. A korábbi localhost browser-hozzáférési elutasítást nem kerültük meg; nem indítottunk más browser/CDP/Playwright tesztet. Nincs képernyőkép-alapú elfogadás.

## Nyitott kockázatok és következő feladat

- **Külön jóváhagyás szükséges:** az esemény viewport API számkonverziós 400-as hibája és a meglévő SRID-eltérés backendhibák. Nem változtattuk a backendet, és nem takartuk el országos event fallbackkel. A dátumszűrt élő események elfogadása ezek javításáig blokkolt.
- A régebbi days API korlátai (távoli fix dátum, többnapos/NULL endTime szemantika) ettől nem oldódtak meg.
- A source clustering workerét megőriztük, a DOM-pinek csak látható feature-ökhöz készülnek; nagyon sűrű, 20-as zoom feletti terület és kis teljesítményű mobil külön teljesítménytesztet igényel.
- A county-provenance és a meglévő legacy Budapest-adat külön adatfeladat marad. Az előző frontend HU-BP kivételt nem bővítettük; adatbázisrekordot vagy hivatkozást nem módosítottunk.
- A szoftverlicenc-ellenőrzés a három új csomagra korlátozott; részletek a findings dokumentumban. Csomagtelepítési szkriptek nem futottak.

**Nem történt:** adatbázis-/séma-/ingestion-/backendadat-módosítás, backend vagy adatbázis indítása/leállítása, deploy, vásárlás, commit vagy push.

## Újrafuttatás

```powershell
Set-Location 'D:\Github\momap\magyarorszag-felfedezo'
node --test apps/frontend/tests/discovery.test.cjs
npm.cmd run build -w apps/frontend
npm.cmd run dev -w apps/frontend -- --host 127.0.0.1 --port 4200
```

Explorer: http://localhost:4200/explore . A meglévő backend élő event API-jának hibája a frontend hibaállapotában látszik; a POI-k már ettől függetlenek. Következő javaslat: külön engedélyezett event viewport backendjavítás, majd browser/mobil/screen-reader elfogadás.
