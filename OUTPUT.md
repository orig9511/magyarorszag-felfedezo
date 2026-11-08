# MOMAP – FOUNDATION-001

Dátum: 2026-11-08. Branch: `feature/momap-foundation-001`.

**Státusz: IMPLEMENTED / UNVERIFIED BUILD & RUNTIME.** A GitHub forráskód módosítva; nincs lokálisan futtatott Nest build, teszt, adatbázis, deploy vagy böngésző.

## Változások
- `AdminTokenGuard` és `AdminAuthModule`: csak legalább 32 karakteres `MOMAP_ADMIN_TOKEN` esetén engedélyezett operator hozzáférés, Bearer fejléc és timing-safe hash összevetés.
- Védett teljes `api/admin`, `api/ingestion`, valamint `api/events` író végpontok.
- Explicit TypeORM `synchronize:false`, `migrationsRun:false`.
- Konfigurálható `CORS_ORIGINS` (production alapértelmezésben deny), meglévő lokális origin fallback megőrzése.
- Új regressziós tesztek: `apps/backend/tests/foundation-security.test.cjs`.

## Nem változott
MapLibre, tile-provider, frontend/POI/event olvasás, ingestion scheduler, DB-tartalom/migrációk, production deployment és eredeti `feature/initial-implementation` ág.

## Ellenőrzés
- **VERIFIED:** GitHub forrásfájlok és branch rendelkezésre állnak, a változás külön fejlesztési ágra korlátozott.
- **UNVERIFIED:** NestJS build, regressziós tesztek, élő HTTP, helyi PostgreSQL és valós production.
- **BLOCKED:** A GitHub-kapcsolat nem biztosít futtatható workspace-t; automatikusan nem telepítettünk csomagokat.

Részletek és validációs parancsok: `docs/outputs/MOMAP-FOUNDATION-001.md`.
Korábbi feladat eredménye: `docs/outputs/MAP-BACKEND-001.md`.
