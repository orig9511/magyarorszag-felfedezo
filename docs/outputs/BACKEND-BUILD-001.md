# MOMAP – BACKEND-BUILD-001

Dátum: 2026-10-15. Branch: feature/initial-implementation.
Státusz: COMPLETED a két jelentett TS2353 fordítási hiba javítására. Az egész backend futásidejű működése ettől még UNVERIFIED.

## Ok és javítás

VERIFIED: a TypeScript noEmit ellenőrzés javítás előtt pontosan reprodukálta a két hibát:

- event-import.service.ts:214: eventType nem létezett a Partial<Event> típusban.
- ticketmaster.adapter.ts:112: eventType nem létezett a RawEventData típusban.

Az importáló és a Ticketmaster adapter már kibővített rekordot használt, de a közös típus és az entitás definíciója elmaradt ettől. Nem hibás Event-import vagy elavult buildtermék volt az ok. Mivel a fordító csak az első ismeretlen objektummezőt jelzi, nem csupán az eventType mezőt egyeztettük.

## Módosított fájlok

- apps/backend/src/modules/event/event.entity.ts: TypeORM-oszlopként eventType, timezone, officialEventUrl, ticketUrl, lastCheckedAt és isTestData. A nullable/default beállítások követik a mezők szerepét. Nem történt adatbázis-migráció.
- apps/backend/src/modules/ingestion/interfaces/data-adapter.interface.ts: opcionális eventType, timezone, officialEventUrl, ticketUrl, sourceName, status és lastCheckedAt a Ticketmaster által ténylegesen előállított rekordhoz.
- apps/backend/tests/event-import-fields.test.cjs: regressziós teszt valódi Ticketmaster-normalizálással, JSON-importtal és TypeORM repository.create/metadata ellenőrzéssel; mock mentés, adatbázis és HTTP nélkül.
- To-do.md és OUTPUT.md: javítás, eredmények és nyitott feladatok.
- docs/outputs/MAP-SESSION-2026-10-15.md: előző jelentés megőrzése.

Az importáló és adapter végrehajtható logikáját nem módosítottuk, nem távolítottunk el importadatot és nem használtunk típusellenőrzést megkerülő castot. A korábban meglévő egyéb backend/frontend módosítások megmaradtak.

## Ellenőrzés

- Javítás előtt: node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/backend/tsconfig.json – FAIL a két jelentett TS2353 hibával.
- Javítás után: npm.cmd run build -w apps/backend – PASS, exit 0.
- node --test apps/backend/tests/event-import-fields.test.cjs – PASS, 1/1 teszt. A tényleges importlánc műfaj-, timezone-, URL-, ellenőrzésiidő- és tesztadat-jelző mezői megmaradnak az ORM-entitásban; a DataSource nincs inicializálva/csatlakoztatva. A szintetikus fixture a temp könyvtárban jön létre, a teszt eltakarítja.
- Javítás után ismételt teljes noEmit fordítóellenőrzés – PASS, exit 0; git diff --check a két érintett backendforrásra és a jelentésekre – PASS (csak LF/CRLF figyelmeztetés).

## Korlátok és következő lépés

Ez a javítás a fordítási és importmező-definíciós hibákat kezeli. Nem javítja a korábbi auditban reprodukált event viewport DTO-konverziót, SRID-eltérést, kategória-/dátumszerződést vagy a külön általános IngestionService mezőátadását. Ezek továbbra is MAP-BACKEND-001 feladatok.

Az entitás camelCase mezőnevei a korábban vizsgált helyi events sémát követik; a történeti SQL 004 snake_case eltérése ettől nem oldódik meg. Más adatbázis sémájának egyeztetése külön feladat. Backendindítás, TypeORM synchronize, adatbázis-írás és migráció nem történt. Commit/push/deploy nem történt.

Újrafuttatás a repository gyökeréből:

```powershell
npm.cmd run build -w apps/backend
node --test apps/backend/tests/event-import-fields.test.cjs
```
