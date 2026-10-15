# MOMAP – MAP-BACKEND-001

Dátum: 2026-10-15. Branch: feature/initial-implementation. Kiinduló HEAD: 3ac9f6a.
**Státusz: VERIFIED – az esemény-API javítása és a kért integrációs ellenőrzések elkészültek; vizuális browser/mobil elfogadás még UNVERIFIED/BLOCKED.**

## Eredmény

- Javítva a numerikus query-paraméterek validációja, az SRID=4326 viewport, a paraméterezett többkategóriás SQL és az események dátumátfedése/null végideje.
- Budapest szerinti naptári napok: Today, Tomorrow, következő N nap és fix dátum. A frontend explicit dateFrom/dateTo paramétert küld; a többnapos eseményt már nem ejti ki a kezdőnap szerinti második szűrés. A dátumhatárok a cache-kulcsban is szerepelnek.
- A viewport/upcoming időpontjainak visszaadása UTC Node-folyamatból is ellenőrzött. A meglevő időzóna nélküli oszlopok Budapest falióraként értelmezettek; az eredeti importoffsetek történeti auditja külön feladat.
- A POI-k dátumfüggetlensége, elkülönített hiba/válasz/cache, a közös map/sidebar kártyák, a kék eseménypaletta, a 400 ms debounce, cancellation, locked overview, megyeanimáció és free roam megmaradt. Nincs országos fallback.

## Ellenőrzés

**VERIFIED:** 49/49 hálózat nélküli teszt (backend 11, frontend 38), külön 1/1 valódi read-only Nest HTTP/PostGIS teszt, backend build és frontend production build PASS. A globális validáció változatlan.

**VERIFIED élő alkalmazás + Angular proxy:** localhost:3000 és localhost:4200 /api/events/viewport egyaránt 200. Dátum nélkül 2 rekord; days=7, ma és holnap 0; november 15-re és december 2-ra külön-külön 1 rekord. Az üres mai lista helyes, a két meglévő esemény későbbi. Az izolált tesztben a hibás queryk 400-at kaptak; a SQL-only tesztadatok többnapos/null/éjféli/DST/térbeli/kategória határesetei PASS.

**VERIFIED biztonság:** a tesztszerver nem töltötte be az AppModule-t vagy ingestiont; synchronize/migrationsRun/installExtensions=false, minden poolkapcsolat szerveroldali read-only. Nem került tesztadat táblába; előtte/utána 2 event és 202 POI. A már futó felhasználói folyamatokat nem indítottuk újra.

**UNVERIFIED/BLOCKED:** renderelt térképlátvány, mobil touch, screen-reader, GPU/FPS és nagy adatmennyiségű terhelés. A korábbi browser-hozzáférési tiltást nem kerültük meg. A mockolt DOM/MapLibre tesztek és a HTTP-próbák nem vizuális ellenőrzések.

A build meglévő figyelmeztetései: unused app-with-events/event-list és MapLibre CommonJS. Új dependency nincs. A development AppModule automatikus sémaszinkronizálása külön indításbiztonsági kockázat maradt; ezt a teszt elkerülte.

## Részletek és következő lépés

Részletes gyökérokok, módosított fájlok, API-szerződés, parancsok és kockázatok: **[docs/outputs/MAP-BACKEND-001.md](docs/outputs/MAP-BACKEND-001.md)**. Korábbi jelentés: docs/outputs/MAP-REFINE-001.md.

Következő javaslat: engedélyezett böngészős MAP-INTEGRATION-001 elfogadás a két valódi eseménnyel, majd külön timestamp/provenance audit. A felhasználó jelen feladata engedélyezte a backend/frontend javítást. DB-, séma-, ingestion-, szolgáltatás- és titokmódosítás, deploy, commit/push/merge nem történt.
