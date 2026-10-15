# MAP-BACKEND-001 – Esemény viewport API javítása és integráció

Dátum: 2026-10-15. Branch: feature/initial-implementation. Kiinduló revision: 3ac9f6a, tiszta munkafa. Remote: https://github.com/orig9511/magyarorszag-felfedezo.git.

**Státusz: VERIFIED – az engedélyezett API-javítás, frontendintegráció, automatizált és élő HTTP/DB ellenőrzés elkészült. A vizuális böngészős elfogadás továbbra is UNVERIFIED/BLOCKED.**

A felhasználó MAP-BACKEND-001 melléklete kifejezetten engedélyezte a nem destruktív backend/frontend kódjavítást és teszteket. Ez feloldja a korábbi MAP-REFINE backend-jóváhagyási kaput, de nem engedélyez DB-módosítást, sémaszinkronizálást, ingestionmódosítást, deployt vagy Git-publikálást. Elolvasva: AGENTS.md, To-do.md, OUTPUT.md és docs/research/MAP-REFINE-001-findings.md. A diagnosing-bugs skill alapján célzott regressziós hurok készült.

## Igazolt gyökérokok és javítások

1. **VERIFIED számvalidáció:** az IsNumber dekorátor HTTP-stringet kapott, DTO-konverzió nélkül. Javítás előtt a valódi Nest ValidationPipe regressziója Bad Request hibával elbukott. Most csak decimális számként értelmezhető érték konvertálódik; üres string, tömb, bool, NaN, Infinity, hexadecimális érték és tartományon kívüli koordináta elutasított. Lat ±90, lon ±180; days egész 1–60. A globális whitelist/forbidNonWhitelisted/transform beállítás nem változott.
2. **VERIFIED SRID:** az eseménypontok SRID-je 4326; a régi ST_MakeBox2D/ST_Point konstrukcióé 0. A régi kifejezés élő PostGIS SELECT-ben mixed SRID hibával reprodukálható. Most paraméterezett ST_MakeEnvelope(minLon,minLat,maxLon,maxLat,4326) készül. Nincs tárolt geometria, index vagy séma módosítva. Invertált, nulla kiterjedésű és dátumvonalon átforduló bbox HTTP 400; a bbox szélén lévő pont szerepelhet a találatok között.
3. **VERIFIED kategóriák:** a korábbi IN (:categories) egyetlen tömbparamétert kötött. A valódi TypeORM által generált SQL regressziója ezt is kimutatta. Most IN (:...categories), trim és duplikátum-kiszűrés működik; minden érték kötött paraméter. A kategóriák vesszővel elválasztott, betű/szám/aláhúzás/kötőjel azonosítók, legfeljebb 500 karakter összhosszal. Üres tokenek HTTP 400; nem létező kategória üres listát ad. Nincs új tartalom vagy kategóriaadat bevezetve.
4. **VERIFIED dátumok:** a régi now + N×24h nem naptári ablak volt; endTime >= fromDate kizárta a NULL végidejű eseményeket. A frontend Today/Tomorrow/fix szűrése csak a kezdőnapot nézte, így a többnapos esemény elveszett. Ezt a kiinduló HEAD komponensét memóriában futtatva is reprodukáltuk: az új többnapos Today-regresszió assert.ok(card) feltétele elbukik; a javított forrás átmegy.
5. **VERIFIED időzóna:** a tárolt startTime/endTime timestamp WITHOUT time zone oszlopok. A keresőhatárok Budapest falióra szerinti stringek, nem gépi időzónától függően szerializált Date objektumok. A viewport/upcoming olvasási lekérdezés AT TIME ZONE Europe/Budapest vetítéssel valós időpontot ad vissza. Az élő HTTP-entitáshidratálás és DST-napi SELECT tesztek UTC Node-folyamatból is sikeresek. A két jelenlegi rekord timezone mezője Europe/Budapest.

## API-szerződés

- A négy bbox-paraméter kötelező: minLat, minLon, maxLat, maxLon. A sorrend mind a frontendhívásban, mind a geometriában ellenőrzött.
- Dátum nélkül a keresés időben korlátlan, de mindig a megadott viewporton belüli aktív eseményekre szűr. Nincs országos fallback.
- days=N: a mai budapesti nap kezdetétől N naptári nap; days=1 a mai nap, days=7 ma és további hat nap. A korábbi paraméternév támogatott, a szemantika szándékosan naptári napra javult.
- dateFrom és dateTo együtt adandó, szigorú YYYY-MM-DD formátumban. Mindkettő inkluzív naptári nap. A tényleges SQL felső határa a dateTo utáni nap 00:00, exkluzívan. Fordított/hiányos/érvénytelen dátum vagy days-szel kevert ablak HTTP 400. A támogatott évhatáron túlcsordulás is 400.
- Today: ma–ma; Tomorrow: holnap–holnap; fix nap: kiválasztott nap–ugyanaz a nap; következő N nap: ma–ma+N−1. A frontend ezeket explicit dátumhatárként küldi. Az Any nem kap önkényes 60 napos korlátot.
- Az esemény akkor szerepel, ha kezdete a felső határ előtt van, és végideje az alsó határ után van VAGY kezdete az alsó határon/belül van. A NULL végidő pillanateseményként szerepel a kezdőnapján. Az előző nap kezdődött, pontosan 00:00-kor véget ért esemény nem kerül a következő napba; a 00:00-kor induló null/azonos végidejű esemény igen.
- Az upcoming county végpont ugyanazt a naptári/átfedési szabályt használja, szintén 1–60 napos validációval. Ismételt vagy hibás days paraméter sem okoz 500-at.

Példa: `/api/events/viewport?minLat=45&minLon=16&maxLat=49&maxLon=23&dateFrom=2026-11-15&dateTo=2026-11-15&categories=concert,festival`.

## Frontend és megőrzött viselkedés

A kezdőnap szerinti második szűrés megszűnt: a szerver által jóváhagyott többnapos esemény nem vész el. A dátumhatárok a cache-kulcsban is szerepelnek, így az új nap új kulcsot kap. A marker továbbra is category=event, a meglévő kék palettával; ugyanaz a kártyahalmaz kerül a térképre és a sidebarba.

**VERIFIED regressziók:** a POI-k dátumfüggetlensége, külön hibakezelése és válaszpublikálása, a Places-only dátumkontroll rejtése, a 400 ms debounce és azonnali cancellation, külön cache, locked overview, megyeanimáció, free roam és országos fallback hiánya megmarad. Az Angular valódi HttpParams osztályával külön teszt ellenőrzi a bbox/dátum/kategórialista szerializálását. A MapLibre/DOM tesztek adapterei mockoltak; ez nem vizuális browserteszt.

## Biztonságos élő ellenőrzés

Az izolált HTTP-teszt csak EventController + EventService modult indít loopback címen, véletlen porton; nem tölti be az AppModule-t, az ingestiont vagy schedulert. TypeORM: synchronize=false, migrationsRun=false, installExtensions=false. Az utóbbi is szükséges: a helyi node_modules/typeorm/driver/postgres/PostgresDriver.js afterConnect kódja különben extension-telepítést próbálhatna.

Minden poolkapcsolat szerveroldali default_transaction_read_only=on opcióval indul. A teszt futás közben ellenőrzi a default_transaction_read_only és transaction_read_only értékét. A titkot kizárólag a meglévő környezeti konfigurációból olvassa, nem naplózza. A szintetikus események SELECT-en belüli json_populate_recordset CTE-ben léteznek; nincs INSERT, UPDATE, DELETE, migráció vagy DDL. A teszt finally ágban leállítja a saját HTTP-szervert és lezárja a kapcsolatot.

**VERIFIED:** élő adatbázis: 2 esemény, 202 POI; a két nem NULL eseménygeometria SRID-je 4326. A számlálók a teszt előtt és után azonosak. A viewport 200-as válaszában a két tényleges rekord azonosítóhalmaza független SQL-ellenőrzéssel egyezik. Hibás bemenetek 400-asak; érvényes kategóriák/dátumok és üres bbox 200-asak.

A már futó felhasználói backend/proxy folyamatokat nem indítottuk és nem indítottuk újra. Külön olvasási GET-próbák:

| Kérés, HU bbox | localhost:3000 | localhost:4200 /api proxy |
|---|---|---|
| dátum nélkül | 200, 2 rekord | 200, 2 rekord |
| days=7 | 200, 0 rekord | 200, 0 rekord |
| 2026-10-15 fix nap | 200, 0 rekord | 200, 0 rekord |
| 2026-10-16 fix nap | 200, 0 rekord | 200, 0 rekord |
| 2026-11-15 fix nap | 200, 1 rekord | 200, 1 rekord |
| 2026-12-02 fix nap | 200, 1 rekord | 200, 1 rekord |

A mai/holnapi/7 napos üres lista helyes: a két meglévő esemény november 15-én és december 2-án kezdődik. Nem gyártottunk mai eseményt a megjelenítés kedvéért.

## Tesztek és build

1. `npm.cmd run build -w apps/backend` – PASS.
2. `node --test apps/backend/tests/environment-config.test.cjs apps/backend/tests/event-import-fields.test.cjs apps/backend/tests/event-viewport.test.cjs apps/frontend/tests/discovery.test.cjs` – **49/49 PASS**, ebből backend 11, frontend 38. Hálózat nélküli tesztek, a frontend API/MapLibre adapterek mockoltak; a ValidationPipe, TypeORM SQL-generátor és Angular HttpParams valódi.
3. PowerShell, csak az ellenőrző folyamat környezetében: `$env:MOMAP_READONLY_TEST='1'; $env:TZ='UTC'; node --test apps/backend/tests/event-viewport.live.test.cjs` – **1/1 PASS**, valódi PostgreSQL/PostGIS + izolált Nest HTTP. A kapcsoló nélkül szándékosan SKIP, nem zöld élő bizonyíték.
4. `npm.cmd run build -w apps/frontend` – PASS, production hash c7e1721567cfdcff. Meglévő figyelmeztetések: unused app-with-events/event-list és MapLibre CommonJS optimalizáció. Új dependency nincs.
5. `git diff --check` – PASS. Nincs ideiglenes debug-log vagy generált buildfájl a változások között.

A javítás előtti első két backendteszt 0/2 PASS volt (numerikus HTTP-validáció, térbeli/kategória SQL). A régi frontend többnapos Today-eset külön baseline-összehasonlításban FAIL; a végső teljes tesztcsomagban PASS.

## Módosított fájlok

- apps/backend/src/modules/event/dto/get-events.dto.ts – lokális számkonverzió és tartomány-/dátum-/kategóriavalidáció.
- apps/backend/src/modules/event/event-date-range.ts – naptári intervallum és Budapest-nap segédfüggvények.
- apps/backend/src/modules/event/event.controller.ts – bbox- és keresztmező-validáció, queryszerződés, kategóriák.
- apps/backend/src/modules/event/event.service.ts – SRID, kategóriák, átfedés, null végidő, időzónás olvasási projekció, upcoming.
- apps/backend/tests/event-viewport.test.cjs – hálózat nélküli valódi validáció/SQL/vezérlő regressziók.
- apps/backend/tests/event-viewport.live.test.cjs – explicit opt-in, read-only HTTP/DB és SELECT-fixture tesztek.
- apps/frontend/src/app/core/services/event.service.ts – dateFrom/dateTo HTTP-paraméterek.
- apps/frontend/src/app/features/explore/explore.component.ts – explicit dátumablak, hibás kezdőnap-szűrés eltávolítása, cache-kulcs.
- apps/frontend/tests/discovery.test.cjs – naptári API-szerződés, valódi HttpParams, többnapos esemény/közös kártyák.
- To-do.md, OUTPUT.md, jelen jelentés; a korábbi OUTPUT archiválva docs/outputs/MAP-REFINE-001.md alatt.

## Korlátok, kockázatok és következő feladat

- **UNVERIFIED/BLOCKED:** tényleges browser/GPU/mobil/touch/screen-reader elfogadás. A korábbi böngészős localhost-hozzáférési tiltást nem kerültük meg. A HTTP-tesztek nem igazolnak renderelt térképpixelt.
- **INFERRED adattörténeti konvenció:** a meglévő timestamp WITHOUT time zone értékek Budapest faliórát jelentenek. A jelenlegi környezet, importkód és két timezone mező ezt támogatja, de minden régi import eredeti időzóna-offsetje nem bizonyítható. Az őszi ismétlődő óra eredeti offsetje már nem állítható vissza az oszlopból. Nincs önkényes adatjavítás vagy sémaátírás. A más időzónában importált történeti adatok külön adatauditot igényelnek.
- A módosított időzónás olvasás a viewport/upcoming útvonalra korlátozott; a régi általános lista/egyedi esemény adminisztratív végpontjainak teljes időzóna-auditja nem ennek a térképes feladatnak a része.
- A teljes alkalmazás development AppModule-ja továbbra is tartalmaz automatikus sémaszinkronizálást és ingestionmodult. Ezt nem indítottuk teszteléshez; a külön indításbiztonsági feladatban érdemes explicit opt-inra váltani, az ingestion ütemezésének mostani módosítása nélkül.
- Nagy országos adatmennyiségen teljesítmény-/terhelésteszt nem történt. A viewport térbeli szűrése és meglévő indexek megmaradtak; nincs új országos lekérés.
- **Következő javasolt feladat:** engedélyezett böngészős MAP-INTEGRATION-001 elfogadás a november 15-i/december 2-i valós rekordokkal, megyeváltás/pan/zoom/filter/sidebar és mobil kezelés ellenőrzésével; külön timestamp/adatprovenance audit. DB-migráció, ingestion, deploy, commit és push továbbra is külön engedélyt igényel.

Nem módosítottunk adatbázisrekordot, sémát, indexet, geometriaértéket, ingestionadatot/ütemezést, PostgreSQL-szolgáltatást/adatkönyvtárat vagy titkot. Nem történt deploy, commit, push vagy merge.
