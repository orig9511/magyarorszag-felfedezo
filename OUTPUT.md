# MOMAP – BACKEND-CONFIG-001

Dátum: 2026-10-15. Branch: feature/initial-implementation.
Státusz: COMPLETED a reprodukált .env-betöltési és hiányzó DATABASE_URL miatti SCRAM hibára. Teljes Nest/HTTP-integráció továbbra is UNVERIFIED.

## Reprodukált ok

A repository gyökerében lévő .env tartalmaz DATABASE_URL-t, a kapcsolati cél 127.0.0.1:5433/postgres, jelszóval. Az apps/backend/.env nem létezik. A ConfigModule eddig a relatív .env útvonalat használta; az npm workspace viszont apps/backend munkakönyvtárból indítja a backendet.

VERIFIED reprodukció az apps/backend könyvtárból: ConfigModule.forRoot({envFilePath:'.env'}) után a DATABASE_URL nem töltődött be; a pg ConnectionParameters jelszava nem volt nemüres string, a port 5432-re esett vissza. A helyi pg/lib/crypto/sasl.js pontosan ilyen nem-string jelszónál dobja a jelentett SCRAM-SERVER-FIRST-MESSAGE hibát. A helyes Event meződefiníciók javítása ettől külön fordítási probléma volt.

## Javítás és fájlok

- apps/backend/src/environment.config.ts: az src/dist helyéből számolt abszolút apps/backend/.env, majd repository-root .env fallback. Nem függ az indítás munkakönyvtárától. A backend-local fájl elsőbbséget kap; a Nest meglévő process-env elsőbbsége megmarad.
- apps/backend/src/app.module.ts: ezeket a fájlokat használja, a DATABASE_URL kötelező és PostgreSQL URL-ként ellenőrzött. Hiányzó értéknél érthető konfigurációs hiba lesz a jelszó nélküli driver-fallback helyett. A hibaszöveg soha nem tartalmazza a megadott URL-t/jelszót.
- apps/backend/tests/environment-config.test.cjs: 4 regressziós teszt a tényleges lefordított helperrel és Nest loaderrel; szintetikus temp .env fixture, nincs valódi hitelesítő adat vagy DB a tesztekben. Fallback, local override, hiányzó URL és titkot nem visszaíró validáció vizsgálata.
- To-do.md és OUTPUT.md frissítve; előző jelentés: docs/outputs/BACKEND-BUILD-001.md.

A valódi .env fájlt, jelszót, szolgáltatáskonfigurációt és tartós környezeti változókat nem módosítottuk. Nem történt migráció, synchronize indítás, dependency install, commit, push vagy deploy. A felhasználó már futó watch-folyamatának esetleges automatikus újraindulását nem vezéreltük.

## Ellenőrzések

- npm.cmd run build -w apps/backend: PASS, exit 0.
- node --test apps/backend/tests/environment-config.test.cjs apps/backend/tests/event-import-fields.test.cjs: PASS, 5/5 (4 új configteszt és az előző importmező-regresszió).
- Az eredeti workspace-reprodukció a javított abszolút útvonalakkal: DATABASE_URL betöltődött, pg jelszó nemüres string, port 5433; PASS, exit 0. A process-env betöltés csak a külön tesztprocesszben történt.
- Külön pg Client, a javított Nest-fájlbetöltésből kapott URL-lel: csatlakozás PASS; BEGIN READ ONLY; SELECT current_database(), inet_server_port(), current_setting('transaction_read_only'); ROLLBACK. Eredmény postgres / 5433 / on. Adatot író SQL nem futott; személyes rekord vagy jelszó nem került kiírásra.
- Teljes NestFactory/HTTP/scheduler futtatás nem történt. A sikeres hitelesítés nem bizonyít teljes entitás/séma- és API-kompatibilitást. A korábban talált event viewport DTO/SRID hibák változatlanul külön feladatok.

## Újraindítás

Ha a már futó watch nem töltötte újra a konfigurációt, állítsd le a saját backend termináljában Ctrl+C-vel, majd a repository gyökeréből:

```powershell
Set-Location 'D:\Github\momap\magyarorszag-felfedezo'
npm.cmd run dev -w apps/backend
```

Ez a teljes alkalmazást indítja, a meglévő development synchronize és ingestion viselkedéssel; a javítás ezeket nem változtatja meg. Nincs szükség jelszócserére vagy a .env fájl átmásolására.
