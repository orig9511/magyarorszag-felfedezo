# MOMAP — Development Roadmap & Project Memory

**Project:** Magyarországi térképes felfedező- és turisztikai platform  
**Repository:** orig9511/magyarorszag-felfedezo  
**Development branch:** feature/initial-implementation  
**Last updated:** 2026-10-15

## Aktuális munkafázis és elsőbbség

- [x] MAP-REFINE-001-DATE – POI/event várakozás és cache szétválasztva; dátumváltás csak eseményt kér újra, Places-only dátumkontroll rejtett. Reprodukált frontend-kapcsolási hibák regressziói PASS; az eredeti browser-látvány nem reprodukált.
- [x] MAP-REFINE-001-MASK – Teljes Polygon/MultiPolygon unió és world-minus-coverage maszk, belső gyűrűk és szigetek megőrzésével; szintetikus és jelenlegi API-geometriás ellenőrzés PASS. GPU-látvány még UNVERIFIED.
- [ ] MAP-REFINE-001-UX – PARTIAL: központi kategóriapaletta, hozzáférhető ikonos pinek/klasztergombok, ponthoz kötött popup, sidebar/legend/intro finomítás kész. 35 frontend-regressziós teszt és production build PASS; tényleges browser/touch/screen-reader elfogadás hátravan.
- [ ] MAP-REFINE-001-API – JÓVÁHAGYÁSRA VÁR: az élő event viewport days=1 és days=7 esetén is 400-as számvalidációs hibát ad; a korábban feltárt SRID-eltérés is megvan. Backend módosítás nem történt, külön engedély szükséges.

Aktuális bizonyítékok és korlátok: OUTPUT.md és docs/research/MAP-REFINE-001-findings.md. A 2026-10-15-i jelen kérés csak frontendfinomítást engedélyez; DB, séma, ingestion és backendadat változatlan.

- [x] DB-001 – Read-only PostgreSQL-felmérés és biztonságos migrációs terv dokumentálva (2026-10-15); részletek: docs/outputs/DB-001.md. PG17.6 / 5433 / C:\Program Files\PostgreSQL\17\data; MOMAP-adatok a postgres adatbázisban, PostGIS 3.5.3. A mentések és backend futásidejű integráció nem igazoltak.
- [ ] DB-001-MIGRATION – KÜLÖN JÓVÁHAGYÁSRA VÁR: cél D:\PostgreSQL\17\data; mentés és restore-próba, PEM-függőségek, karbantartási ablak, jogosultságok, adatellenőrzés és rollback szükséges. Migráció nem történt.

Az architektúra- és térképes audit elkészült a mostani hatókörben. A 2026-10-15-i Autonomous Map Development Session prompt külön engedélyezte a terv szerinti nem destruktív frontend-fejlesztést, buildet és teszteket; ez nem engedély backendváltozásra, DB-migrációra vagy deployra. A korábbi technológiai, licenc- és költségállítások történeti kontextust adnak; teljes platformauditot és éles jóváhagyást nem helyettesítenek.

- [x] SETUP-001 – Dokumentációs munkafolyamat; korábbi diff-blokkolás DB-001 alatt megszűnt. Történeti jelentés: docs/outputs/SETUP-001.md.
- [x] P0-00 – Architektúra/map hatókörben az ellentmondások és bizonyítékhiányok feltárva: docs/research/P0-architecture-map-audit.md és P0-map-provider-audit.md. Teljes OSS/CMS licenc- és költségaudit továbbra is nyitott.
- [ ] MAP-SESSION-C–F – PARTIAL: frontend-megvalósítás kész, osztályszintű regressziós tesztekkel és production builddel; tényleges böngészős/mobilos és élő API-elfogadás hátravan. Részletek: OUTPUT.md.
- [ ] MAP-SESSION-G – PARTIAL: build és 19 hálózat nélküli teszt PASS; böngészős hozzáférés elutasítva, UI/GPU/touch ellenőrzés BLOCKED.
- [x] BACKEND-BUILD-001 – A két TS2353 hiba javítva; backend build és importlánc-regresszió PASS. Történeti jelentés: docs/outputs/BACKEND-BUILD-001.md.
- [x] BACKEND-CONFIG-001 – Relatív .env miatt kimaradó DATABASE_URL és SCRAM jelszóhiba javítva. Build és 5 teszt PASS; read-only kapcsolat postgres:5433 PASS. Történeti jelentés: docs/outputs/BACKEND-CONFIG-001.md.
- [ ] MAP-BACKEND-001 – NYITOTT: event DTO számkonverzió, SRID=4326 viewport, többértékű kategória és dátumszemantika; az eventType fordítási hibák külön BACKEND-BUILD-001 feladatban megoldva. További végrehajtás külön jóváhagyást igényel.
- [ ] MAP-DATA-001 – KÜLÖN ADAT/MIGRÁCIÓS TERV: 20 kanonikus régió, Budapest seed hivatkozásainak megőrzése/egyeztetése, provenance és entity/migration eltérés. Frontenden a HU-BP csak HU-BU jelenlétében rejtett, DB nem változott.

A következő javasolt munkamenet a backendhibák külön jóváhagyott javítása és a böngészős/élő integrációs elfogadás. Provider-vásárlás, DB-migráció, deploy, commit és push továbbra is külön jóváhagyást igényel.

Jóváhagyott térképes termékkövetelmények: zárolt Magyarország-áttekintés vármegyeválasztásig; animált közelítés után szabad barangolás; a szűrők feletti ismertető önálló bezárása; kb. 400 ms-os viewport-alapú POI/event lekérés; közös térképi és listás eredményhalmaz. Mentett helyek és útitervek későbbi bővítés; most nincs teljes útvonaltervező.

---

## 1. PROJECT VISION

A Momap egy Magyarországra fókuszáló, interaktív,
térképközpontú turisztikai és eseményfelfedező platform.

Két fő pillére:

### Events
- Koncertek, fesztiválok, bulik és klubestek.
- Kulturális és városi rendezvények.
- Sportesemények.
- Kisebb települések helyi programjai.

### Points of Interest
- Várak, kastélyok és műemlékek.
- Múzeumok és történelmi helyszínek.
- Természeti látványosságok.
- Kilátók, parkok és túracélpontok.

**Initial pilot:** Budapest és Debrecen.

---

## 2. TECH STACK

Frontend:
- Angular
- TypeScript
- MapLibre

Backend:
- NestJS
- TypeORM
- PostgreSQL
- PostGIS

Data ingestion:
- Source-specific adapters
- Scheduled background processing
- Normalization and deduplication

IMPORTANT:
Preserve the existing architecture.
Do not rebuild working components unnecessarily.

---

## 3. CURRENT REPOSITORY STATUS

The active application is located in:

feature/initial-implementation

Existing components identified:

- Angular frontend
- Landing page
- Interactive map
- MapLibre integration
- POI management
- Event management
- County and settlement modules
- PostgreSQL/PostGIS integration
- OSM adapter
- Wikidata adapter
- Ticketmaster adapter
- CSV/JSON event import
- Ingestion scheduler

NOTE:
These components exist in the repository.
Their runtime behavior and completeness
have not all been verified.

---

## 4. CONFIRMED DEVELOPMENT DECISIONS

### 4.1 Event Collection

Use targeted source discovery.

Potential sources:
- Municipal websites
- Cultural centers
- Concert venues
- Festivals
- Theaters
- Local tourism organizations

Use APIs, structured data or permitted extraction.

Each event should contain:
- Title
- Description
- Start and end time
- Location
- Settlement
- Coordinates
- Category
- Performers when available
- Source URL
- Attribution and license metadata

Implement cross-source deduplication.

### 4.2 Event Monitor

Automatically check events for changes.

Initial proposed intervals:

- More than 30 days: weekly
- 7–30 days: daily
- 1–7 days: every 6 hours
- 2–24 hours: every 1–2 hours
- Less than 2 hours: every 30 minutes

Adjust according to source restrictions.

Track:
- Schedule changes
- Location changes
- Cancellations
- Postponements
- Source availability

An unavailable source must not
automatically mark an event as cancelled.

### 4.3 Permanent Attractions

Import permanent POIs into PostgreSQL/PostGIS.

Use targeted updates instead of
repeated full imports.

Potential sources:
- OpenStreetMap
- Wikidata
- Other verified datasets

Respect licensing and attribution.

### 4.4 Map Experience

Keep MapLibre.

Planned improvements:
- Smooth zooming and panning
- Efficient viewport requests
- Marker clustering
- Reduced unnecessary rendering
- Improved loading performance
- Hungary visually emphasized
- Neighboring countries faded
- Subtle Hungarian border highlight

Prefer a lightweight geographical mask
before attempting GPU-intensive blur.

---

## 5. DEVELOPMENT BACKLOG

### P0 — Repository Audit

- [x] P0-01 Architecture/map audit kész a kért körben; docs/research/P0-architecture-map-audit.md. Teljes platform biztonsági/függőségi sign-off nincs.
- [ ] P0-02 Verify frontend and backend builds
- [ ] P0-03 Review database entities and migrations
- [ ] P0-04 Review environment configuration
- [ ] P0-05 Align documentation with actual code

### P1 — Map Optimization

- [x] P1-01 Map request/rendering forrásaudit; benchmark UNVERIFIED.
- [ ] P1-02 PARTIAL: 400 ms debounce, azonnali cancel, viewport/filter cache; 19 regressziós teszt részeként ellenőrizve, élő API hátravan.
- [ ] P1-03 PARTIAL: MapLibre mixed POI/event clustering implementálva; vizuális/cluster click elfogadás hátravan.
- [ ] P1-04 PARTIAL: országmaszk és vármegyeállapotok implementálva; valós geometriás vizuális ellenőrzés hátravan.
- [x] P1-05 Provider feltételek felülvizsgálva: docs/research/P0-map-provider-audit.md. Éles szolgáltató még nincs kiválasztva/jóváhagyva.

### P1 — POI System

- [ ] P1-06 Review OSM and Wikidata adapters
- [ ] P1-07 Replace recurring full POI imports
- [ ] P1-08 Verify county and settlement mapping
- [ ] P1-09 Improve POI deduplication

### P1 — Event Intelligence

- [ ] P1-10 Audit existing event ingestion
- [ ] P1-11 Build verified event source registry
- [ ] P1-12 Research reusable open-source collectors
- [ ] P1-13 Integrate first local event source
- [ ] P1-14 Improve event normalization
- [ ] P1-15 Implement cross-source deduplication

### P2 — Event Monitoring

- [ ] P2-01 Design adaptive monitoring scheduler
- [ ] P2-02 Implement event change detection
- [ ] P2-03 Implement event change history
- [ ] P2-04 Implement source failure handling
- [ ] P2-05 Test cancellation and postponement logic

### P3 — Expansion

- [ ] P3-01 Validate Budapest pilot
- [ ] P3-02 Validate Debrecen pilot
- [ ] P3-03 Expand to additional cities
- [ ] P3-04 Improve data quality and coverage

---

## 6. DEVELOPMENT RULES

1. Read this file before starting development.

2. Inspect existing code before implementing
   new functionality.

3. Avoid unnecessary rewrites.

4. Preserve existing database data.

5. Use small, reviewable changes.

6. Never mark a task completed without
   verifying the implementation.

7. Update this file after every completed task.

8. Document modified files and test results.

9. Do not merge into main without approval.

10. Keep the project memory synchronized
    with actual repository changes.

---

## 7. REQUIRED OUTPUT FORMAT

After every development task, provide:

### OUTPUT

**Task ID:**
**Status:** Completed / Partial / Blocked

**Branch:**
**Modified files:**

**Changes made:**

**Verification:**
- Tests executed
- Build status
- Remaining issues

**Risks:**

**Next recommended task:**

---

## 8. DEVELOPMENT HISTORY

### 2026-10-15 — MAP-REFINE-001

- Frontend regressziós teszttel reprodukálva: a közös combineLatest visszatartotta a POI-t, amíg az eseménykérés nem válaszolt; a dátumváltás feleslegesen újrakérte a POI-t. Külön forrásstreamek és cache-ek javítják, a 400 ms debounce és azonnali cancel megmaradt.
- Maszkgyökérok: külön county shell-ek mint átfedő lyukak, belső ringek elvesztése. Teljes geometriák uniója és különbség, bemeneti adatmódosítás nélkül. Új frontendfüggőség: polygon-clipping 0.15.7, licencek és két futásidejű függőség ellenőrizve, notices assetben megőrizve.
- Ikonos, kategóriaszínű natív marker- és klasztergombok; közös palette, focus/hover/selected/tooltip, koordinátához kötött popup. Mobilon egy pin koppintása a térképen tart. Sidebar részletek, kompakt reszponzív szélesség, összecsukható legend és őszinte intro-üres állapotok.
- 35 frontendteszt PASS; production build PASS, hash 98fc25ccbc3b9ac9. Éles POI GET 200/202 rekord; event GET 400 mindkét dátumablaknál. Browser/AT/touch/GPU vizsgálat nincs, a korábbi hozzáférési elutasítást nem kerültük meg.
- Backend és scripts Git diffje üres; nem történt DB-, ingestion-, szolgáltatás- vagy backendadat-módosítás, deploy, commit vagy push.

### 2026-10-15 — BACKEND-CONFIG-001

- A workspace-munkakönyvtárból a relatív .env nem találta a repository gyökérfájlját; a pg jelszó nélkül, 5432-es alapporttal próbált kapcsolódni. Reprodukció javítás előtt FAIL, javítás után PASS.
- Abszolút backend-local/repository-root env-útvonalak és titkot nem tartalmazó URL-validáció; valódi .env és jelszó nem változott.
- Backend build és 5/5 teszt PASS; külön pg Client read-only tranzakcióval a postgres adatbázis 5433-as portján PASS. Teljes Nest alkalmazást nem indítottunk.
- Migráció, szolgáltatásmódosítás, commit és push nem történt. Korábbi jelentés: docs/outputs/BACKEND-BUILD-001.md.

### 2026-10-15 — BACKEND-BUILD-001

- A két jelentett TS2353 fordítási hibát noEmit ellenőrzéssel reprodukáltuk, majd az importáló által már használt mezőkhöz igazítottuk az Event és RawEventData definícióját.
- Backend build PASS; valódi adapter→JSON-import→TypeORM entity.create/metadata regressziós teszt PASS, adatbázis és hálózat nélkül.
- Adatbázis-migráció, alkalmazásindítás, commit, push és deploy nem történt. A viewport API további hibái nyitottak.
- Korábbi frontendjelentés: docs/outputs/MAP-SESSION-2026-10-15.md.

### 2026-10-15 — P0-00/P0-01 + Autonomous Map Development Session

- A–B: helyi forrás-, séma- és read-only SQL-audit, provider-kutatás, fázisonkénti elfogadási terv elkészült. P0-architecture-map-audit.md az implementáció ELŐTTI bizonyítékokat őrzi.
- C–F: engedélyezett frontend-változások: zárolt overview, county transition/roam, önálló intro-X, sidebar filterek, közös mixed marker/card modell, klaszterek, 400 ms viewport pipeline, korlátos cache és forrásrészhibák. Landing/editorial route megtartva; nem alakítottuk egyetlen közös kamerájú landing/explorer oldallá.
- G: 19 osztály/modellszintű teszt PASS; frontend production build PASS. Backend előzetes noEmit ellenőrzés FAIL két meglévő eventType hibával. HTTP/DB-író alkalmazásindítás nem történt.
- Böngésző UI-próbáját a jogosultsági kapu elutasította; nem történt kerülőutas teszt. Mobil, GPU, országmaszk, tile/attribúció és élő eseménytalálatok elfogadása nyitott.
- Backend és scripts 49 fájlja SHA-256 összevetéssel változatlan. DB, szolgáltatások, titkok nem módosultak; függőségtelepítés, commit, push, merge, vásárlás és deploy nem történt.

### 2026-10-15 — DB-001

- Csak olvasási OS- és SQL-felmérés; a PG17 aktív adatkönyvtára igazoltan a C:-n van. Külön PG18-szolgáltatás fut a 5432-es porton.
- A postgres adatbázisban 21 county, 202 POI, 2 event, 1 settlement és 3 ingestion_job rekord; PostGIS 3.5.3. A klaszter pem adatbázist is tartalmaz.
- D: NTFS, kb. 41,3 GiB szabad. Használható mentés nem igazolt; a keresés nem teljes körű.
- OUTPUT.md: felmérés, előfeltételek, mentés/restore-próba, leállított klasztermásolat terve, ellenőrzés és rollback. Előző jelentés: docs/outputs/SETUP-001.md.
- A szolgáltatásokat, adatfájlokat, környezeti változókat és alkalmazáskódot nem módosítottuk; commit/push nem történt. A migráció külön jóváhagyásra vár.

### 2026-10-15 — SETUP-001

- VERIFIED: a helyi Git gyökér `D:/Github/momap/magyarorszag-felfedezo`, remote-ja és branche megfelel az elvárt projektnek; a kezdeti munkafa tiszta volt.
- A helyi origin referencia egy dokumentációs commitját fast-forward módszerrel átvettük: `cf2b05e` → `049c60d`; kizárólag a meglévő `To-do.md` került be.
- Elkészült az `AGENTS.md` munkafolyamat és az `OUTPUT.md` jelentés; ez dokumentációs próbamunka, alkalmazáskód-módosítás nélkül.
- UNVERIFIED: az élő GitHub állapota (fetch nem történt), futásidejű működés és auditállítások.
- Következő javaslat: P0-00/P0-01. Commit/push nem történt.

### 2026-10-12 — PM-001

Task:
Initial project review and roadmap consolidation.

Findings:
- Existing application identified in development branch.
- Event ingestion infrastructure already exists.
- POI ingestion scheduling requires review.
- Event monitoring requires further implementation.
- Map performance requires investigation.
- Production map tile provider requires review.

Verification:
Source code inspection only.
No runtime tests executed.

Next:
P0-01 — Complete repository architecture audit.

---

## 9. PROJECT MEMORY POLICY

This file is the project's persistent
development memory.

It must reflect:
- Confirmed decisions
- Actual implementation status
- Outstanding tasks
- Completed changes
- Test results
- Known issues
- Next development steps

The repository code and verified test results
remain the source of truth.

Never invent completed work.
