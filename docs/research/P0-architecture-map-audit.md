# P0-00/P0-01 – Architektúra- és map redesign audit

2026-10-15. Vizsgált HEAD: 7c65f962b4268b0b6f76a8300a568ef3f2509adc, a meglévő nem commitolt munkafával együtt. Ez a kódállapot implementáció ELŐTTI felmérése. VERIFIED = tényleges forrásolvasás vagy végrehajtott próba; INFERRED = következtetés; UNVERIFIED = nem vizsgált működés; BLOCKED = konkrét akadály. A teljes OSS/dependency/GDPR audit nincs e feladattal lezárva.

## Jóváhagyott termékspecifikáció

A felhasználó 2026-10-15-i utasítása felülírja a korábbi szabad kezdőnézetet: Magyarország áttekintés vármegyeválasztásig zárolt; animált vármegyezoom után szabad barangolás, vármegyék között is. Az ismertető a szűrők felett jelenjen meg, önálló bezárással. POI és esemény viewport, zoom és szűrő szerint, kb. 400 ms debounce, elavult válaszok kizárásával; térkép és oldalsáv közös eredményhalmaz. Mentett helyek és útitervek későbbi bővítés, nem most implementálandó teljes rendszer.

A később kapott Autonomous Map Development Session prompt engedélyezi a nem destruktív frontend-változtatásokat, buildet és teszteket. Backendváltozás, DB-migráció, vásárlás, deploy, commit/push/merge nincs engedélyezve. DB-001 migrációs kapuja továbbra is érvényes.

## Meglévő architektúra és eltérések

| Téma | Ellenőrzött forrás / eredmény | Következmény |
|---|---|---|
| Frontend | package.json és telepített manifestek: Angular 17.3.12, MapLibre 4.7.1, RxJS; standalone és lazy routes, külön landing SVG és /explore MapLibre | VERIFIED. Angular 21/Leaflet dokumentáció nem a jelenlegi alkalmazás. Meglévő engine megtartandó. |
| MapLibre licenc | node_modules/maplibre-gl/LICENSE.txt teljes szövege BSD-3-Clause; manifest is ezt jelzi | VERIFIED helyi csomag, notices megőrzendők; teljes transzitív licencellenőrzés UNVERIFIED. |
| Backend | NestJS 10.4.22, TypeORM 0.3.31, PostgreSQL/PostGIS modulok; admin, ingestion, POI, event, county, settlement | VERIFIED. Nem indítjuk el auditként: TypeORM synchronize development módban és ScheduleModule automatikus írásokat indíthat. |
| Kezdőnézet | map.service.ts:52–68 center+zoom, NavigationControl, moveend; nincs interakciózár vagy országot méretező kezdeti fitBounds | VERIFIED. Mobilon teljes ország fedettsége UNVERIFIED. |
| Vármegyekiválasztás | explore.component.ts applyCountyParam, MapService.showCountyDetail: fitBounds 350 ms | VERIFIED kód. Nincs overview/transition/roam állapot; a geometry válasz a map load elé érkezhet, ilyenkor részlet/zoom elveszhet. |
| Megjelenítés | MapService GeoJSON county/POI source és circle layer; setData; active nem kerül feature tulajdonságba | VERIFIED. Nincs clustering, event marker, országmaszk vagy inactive-stílus. |
| Lekérések | explore.component.ts:190 debounceTime(250), switchMap, combineLatest | VERIFIED. Kérésváltási alap van; új esemény debounce-ablaka alatt régi válasz még befuthat, explicit generation guard nincs. |
| Eredmények | setPOIs(pois), de sidebar POI+event és max 20, opcionálisan random sorrend | VERIFIED. Eseményeknek nincs marker; térkép és lista nem azonos eredményhalmaz. |
| Határátlépés | eventRequest countyId=selectedCounty.id, a POI-hívásban nincs countyId | VERIFIED. Események beragadnak a kiválasztott vármegyébe. |
| Felesleges országos keresés | üres POI találatnál HUNGARY_BOUNDS hívás elsewhereCount céljára | VERIFIED. Nem pontos aggregált count, POI API 1000-es cap; eltávolítandó. |
| Dátum | kliens helyi naptár szerint startnapot szűr, szerver days és endTime alapján; fix dátumhoz 60 napos kérés | VERIFIED. Többnapos/NULL endTime és timezone szemantika nincs összehangolva; Hungary Europe/Budapest szerződés kell. |
| UI | dátumszűrő a térképen, kategóriák a felső sávban; nincs vármegyeismertető; mobil map/list toggle | VERIFIED. Bezárható introduction és tartós sidebar-filter szükséges. |
| Jövőbeli mentések | nincs mentett hely/itinerary modul az átvizsgált térképes kódban | VERIFIED a vizsgált körben. Stabil kind:id referencia ajánlott, most nincs auth/útvonaltervező szükséglet. |

## Geometriák: érvényes nem azonos hitelessel

VERIFIED read-only SQL a .env célján (127.0.0.1:5433/postgres), személyes rekordok nélkül:

- 21 county sor, mind aktív. Két Budapest: HU-BP (5 pont, téglalap, kb. 755 km²), HU-BU (284 pont, kb. 525 km²). HU-BP alakja a scripts/seed-counties.sh mintatéglalapjával egyezik; ez seed/minta, nem valós határ.
- 0 üres, 0 ST_IsValid szerint hibás geometry; ország bbox kb. [16.113849,45.737049,22.896530,48.585254]. Ez nem igazolja eredetet, aktualitást vagy közigazgatási pontosságot.
- counties oszlopok: id,name,nameEn,code,geometry,active,createdAt. Hiányzik source/sourceId/license/attribution/sourceUpdatedAt/displayGeometry; County entity sem tartalmazza őket.
- scripts/import-counties.mjs húsz Lechner egységet, SHA-256 ellenőrzést, EPSG:23700→4326 transzformációt, ST_CoverageSimplify-t és provenance oszlopokat vár. Az oszlopok és konfliktuskulcs hiányában a jelenlegi sémával nem használható. A script kommentjének development-start javaslata nem elfogadható audit/migráció helyett.
- A frontend county.service.ts alapértelmezett „Lechner Tudásközpont / Open data” attribúciója nem bizonyíték. Egy ismeretlen eredetű rekordra nem rendelhető automatikusan ilyen állítás.
- A backend county endpoint teljes entitást küld; nincs valódi egyszerűsített overview mező. A frontend geometry fallback teljes poligonokat rajzol. Az SVG active állapotot nem őriz meg és minden rekordhoz linket hoz létre.

Lechner feed és CSW metaadat megnyitása ebben a körben BLOCKED (web tool Internal Error/not accessible). A korábbi _sources-geo.md állításai és az importscript CC-BY-4.0 felirata történeti bizonyíték, nem az adatbázissal való igazolt származási lánc. Indulás előtt újraellenőrzött eredet, licenc és aktuális 20 régió kell; adatot most nem javítottunk/töröltünk.

## API és séma

- VERIFIED POI: GET /api/pois/viewport; minLat,maxLat,minLng,maxLng, categories,countyId. ST_MakeEnvelope(...,4326), ST_Intersects; paraméterezett; limit 1000, nincs rendezés, pagination/truncation jelzés, zoom/ranking vagy settlement/free szűrő. DTO számmá konvertál, de földrajzi tartomány/sorrend ellenőrzés hiányzik.
- VERIFIED event: GET /api/events/viewport; minLat,minLon,maxLat,maxLon,categories,countyId,days. Nincs viewport cap/zoom; kategória IN (:categories) használat eltér a POI helyes spread paraméterétől; többértékű szűrő javítandó és integrációsan tesztelendő.
- VERIFIED reprodukció: event DTO default plainToInstance + validateSync esetén a query string számparaméterei stringek maradnak, mind az öt IsNumber hibás. main.ts globális ValidationPipe transform:true-t használ, de DTO-n nincs Type és enableImplicitConversion sincs. HTTP endpoint válasza nem lett futásidőben vizsgálva; a validációs alappróba ténylegesen futott.
- VERIFIED SQL reprodukció: events.location SRID=4326, ST_MakeBox2D(ST_Point(...),ST_Point(...)) SRID=0. Az event szolgáltatásnak megfelelő ST_Intersects SELECT hibája: Operation on mixed SRID geometries (Point, 4326) != (Polygon, 0). BEGIN READ ONLY alatt, kapcsolat lezárása rollbackkel; adat nem változott.
- VERIFIED a frontend event catchError([]) elrejti a fenti hibát. Az új UI külön event hibát jelezzen, a működő POI eredmények maradjanak használhatók. Nationwide getAllEvents fallback nem megengedett megoldás.
- VERIFIED DB: POI és event GiST location index van. EXPLAIN (nem ANALYZE) a POI bboxra Bitmap Index Scan-t mutat; ez tervezett indexhasználat, nem sebességmérés. County geometry index és code unique index nem jelent meg. SQL migration 001 snake_case, entity/default naming camelCase; meglévő DB is camelCase. Adatmegőrző migrációterv szükséges a backend módosításához.
- VERIFIED admin controller kommentben auth TODO, a vizsgált backendben nincs UseGuards/APP_GUARD. Health endpoint hardcoded true. Ez nem teljes biztonsági audit, de nyilvános deploy blokkoló kockázat. CORS nem hitelesítés.

## Dokumentációs ellentmondások kezelése

Ez a dátumozott audit és a friss To-do státusz az aktuális feladat bizonyítéka; az alábbi régi állításokat nem fogadjuk el implementációs döntésként. A történeti fájlok nem lettek csendben átírva.

| Ellentmondás | Feloldás / további munka |
|---|---|
| 00-executive-summary Angular21/Leaflet/Redis/CMS vs tényleges Angular17/MapLibre/Nest | Meglévő stack megtartása, nincs automatikus upgrade/Redis/CMS bevezetés. |
| 00/09 Strapi egyszerű MIT, Directus $5M licenc és költségállítás vs 01 részletes korrekció | Korábbi állításokat UNVERIFIED-ként kezeljük ebben a körben; CMS/licenc újraellenőrzés külön, most nincs integráció. |
| 10-source-register „COMPLETE”, kulturinfo CC-BY/SPARQL vs 04 és _sources-geo tiltása/hozzáférési korlátai | Nincs bizonyított adatimport-jog, a kulturinfo állítás nem használható. Teljes forrásregiszter-frissítés külön auditmunka. |
| <100ms, Redis essential, 20 hét/€128k költség vs nincs benchmark vagy jóváhagyott erőforrás | Mérési cél és költségbecslés nélkül nem tény vagy elfogadott keret. |
| Szabad kezdőnézet vs zárolt overview | A mai explicit felhasználói követelmény dönt: overview locked, megye után roam. |
| Minden régió aktív vs fokozatos aktiválás | Aktív flag tiszteletben tartandó; DB flag-eket most nem módosítjuk. |
| Valós/attribútált county import vs hiányzó provenance és Budapest seed | Nincs éles adatpontossági vagy jogi sign-off. |
| OSMF „production prohibited” vs tényleges policy | Nem általános kereskedelmi tiltás, hanem feltételes best-effort szolgáltatás, SLA nélkül. Részletek a provider-auditban. |

## Megvalósítási terv, függőségek és elfogadási feltételek

Megtartandó: MapLibre engine, Angular service-ek és route-ok, működő POI/API alap, meglévő landing/editorial tartalom. Javasolt frontend seam: MapService csak kamera/layer/interaction, Explore koordinálja az állapotot és a lekérdezéseket; pure discovery model felel közös marker/card azonosítóért és szűrésért. Kezdetben nincs új szolgáltatás, state-library vagy útvonaltervező.

| Fázis | Tartalom / függőség | Ellenőrizhető elfogadás | Kockázat / kapu |
|---|---|---|---|
| A–B | Ez az audit, bizonyítékok, terv | Forráshelyek, SQL/DTO/typecheck és korlátok dokumentáltak | Teljes platformaudit nem lezárt. |
| C | Overview state, adaptív Hungary fit, aktív/inaktív megye, országmaszk, mouse/touch/keyboard county választás | Overview alatt 0 POI/event request; pan/wheel/touch/keyboard/zoomgomb nem mozgat, county választás igen; mobilon teljes ország látható | Hiteles geometria és provenance külön backend/adatkapu; legacy seed nem promótálható valós vármegyének. |
| D | Állapotgép overview→transition→roam, animáció és load-ready kezelés, vármegyeismertető a szűrők felett | Legutolsó county selection nyer; interakciók csak animáció végén oldanak; reduce-motion mellett is működik; X csak intro-t zár, kamera és filter marad | Valódi leírás/kép hiányában őszinte üres állapot; külön editorial/API nélkül nincs kitalált tartalom. |
| E | 400ms viewport pipeline, azonnali régi kérés érvénytelenítés, szűrő/bounds/zoom query key, korlátos cache, stabil source és mixed clustering | Gyors mozgatás egy nyugalmi lekéréspárt eredményez; késői válasz nem ír vissza; county határon átlépve nem marad countyId scope; üres állapot nem kér országos POI-listát | Esemény-API DTO/SRID hibái backendjavításig blokkolják az élő eseménytalálatokat. |
| F | Közös kind:id eredményhalmaz, POI/event mód, kategória/dátum, reszponzív discovery panel | Minden listázott térbeli találatnak marker/cluster reprezentációja van; marker és card ugyanazt választja; pagination egyértelmű; forrásrészhiba külön látszik | Nem támogatott settlement/free/ranking filtert nem szabad működőnek mutatni; dátum backend-szerződés külön rendezendő. |
| G | Build, regresszió és interakciós próba, teljesítmény-mérés | Production frontend build, meaningful model/interaction tests; mouse/touch/keyboard, resize, close/reopen, back/deeplink, cluster és abort/error esetek tényleges vizsgálata | Böngészős fixture teszt nem bizonyít élő backend-integrációt; ezt külön jelölni kell. |
| H, később | Backend bbox validáció, DTO/SRID/date/categories, stabil pagination/cap/ranking, migráció/provenance és auth; provider kiválasztás | Izolált DB-integrációs tesztek, 20 hiteles régió, adatmegőrzés, éles domain/attribúció/quota kapu teljesül | E körben nem engedélyezett backend/DB/vásárlás/deploy. |

Mentett helyek/útitervek később: stabil {kind,id} referencia a POI/event rekordhoz, külön user-owned saved-place és itinerary-stop domain; sorrend és opcionális időpont az útiterven. Nem MapLibre feature-state a tartós forrás. Auth, adatminimalizálás és törlés külön tervezendő; most nem vezetünk be adatbázistáblát vagy fizetős routing API-t.

Provider: részletes elsődleges források és elfogadási kapuk: [P0-map-provider-audit.md](P0-map-provider-audit.md). OSM adatlicenc és tile-szolgáltatási feltételek külön. Sem fizetős csomag, sem PMTiles infrastruktúra nincs jóváhagyva.

## Végrehajtott próbák

- node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/frontend/tsconfig.app.json: PASS; csak TS, nem Angular template/build/browser bizonyíték.
- Ugyanez apps/backend/tsconfig.json: FAIL, event-import.service.ts:214 eventType nem Partial<Event>; ticketmaster.adapter.ts:112 eventType nem RawEventData. Ezek meglévő hibák, most nem javítjuk.
- Memóriában transpile-olt GetEventsDto + plainToInstance/validateSync: string query numerikus mezők validációja FAIL, fent dokumentálva.
- psql -X -w ON_ERROR_STOP read-only SELECT, pg_indexes, EXPLAIN, geometry validity/bounds és event SRID reprodukció; HTTP backend nem indult, adatot író SQL nem futott.
- Frontend test script ténylegesen buildet futtat; nincs Angular test target; rg nem talált alkalmazásteszt-fájlokat a vizsgált fában. A lint backend script --fix miatt auditban nem futott.
- Lechner metadata elérés BLOCKED; teljes build, mobil/GPU, HTTP-integráció, valódi tileminőség és teljesítmény benchmark UNVERIFIED az audit lezárásakor.

Elsődleges ellenőrzött technikai referenciák: [MapLibre Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) (aktuális docs, v4 helyi típusokkal ellenőrizendő implementáció); [Angular HttpClient](https://angular.dev/guide/http/making-requests) (unsubscribe/abort); [PostGIS ST_MakeEnvelope](https://postgis.net/docs/ST_MakeEnvelope.html) (SRID explicit paraméter). Dátum: 2026-10-15. Az audit későbbi implementációs eredményeit az OUTPUT.md külön naplózza.
