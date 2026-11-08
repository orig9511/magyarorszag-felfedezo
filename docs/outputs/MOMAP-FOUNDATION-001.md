# MOMAP-FOUNDATION-001 – Backend foundation hardening

Dátum: 2026-11-08. Branch: `feature/momap-foundation-001`.
Státusz: IMPLEMENTED, BUILD/RUNTIME UNVERIFIED (nincs telepített projektfüggőségeket tartalmazó futtatási környezet).

## Scope
- Átmeneti admin/operator Bearer token védelmet kapnak a `/api/admin/*`, `/api/ingestion/*` végpontok és a `POST/PATCH /api/events` módosító útvonalak.
- A nyilvános POI-, megye- és eseményolvasás változatlan marad.
- A TypeORM `synchronize` és `migrationsRun` mindig `false`: alkalmazásindítás nem módosíthat automatikusan sémát.
- A böngészős CORS origin lista `CORS_ORIGINS` változóval állítható. Production környezetben alapból nincs engedélyezett külső origin.
- A térképmotorhoz, tile-szolgáltatóhoz, frontendhez, adatbázishoz, deploymenthez és ingest schedulerhez nem nyúltunk.

## Operator configuration
A `MOMAP_ADMIN_TOKEN` legalább 32 karakteres, véletlenszerű titok legyen. Példa generálásra:
```bash
openssl rand -hex 32
```
A kapott tokent kizárólag lokális .env-be / titokkezelőbe tedd, soha ne a repóba, URL-be vagy frontend bundle-be. Kérés:
```http
Authorization: Bearer <your-secret>
```
Hiányzó vagy rövid token esetén a védett API 503-at ad (fail closed), hibás tokenre 401-et. A nyilvános GET végpontok nem kérnek admin tokent. A frontend böngészőből ne tároljon operator secretet.

Példa éles origin beállításra:
```dotenv
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```
Ha production módban nincs CORS_ORIGINS, az API nem engedélyez cross-origin böngésző-hozzáférést. Ez NEM végpontvédelmi mechanizmus.

## Backward compatibility and limitations
- Az admin/moderáció és ingestion API eddigi hitelesítés nélküli hozzáférése szándékosan megszűnik. Lokális manuális import esetén előbb legyen MOMAP_ADMIN_TOKEN.
- A meglévő admin UI API-kliensekbe (ha később lesz ilyen) a tokent nem szabad beégetni; ez átmeneti operátori védelem, nem többfelhasználós auth.
- A TypeORM már nem hoz létre új táblákat automatikusan. Üres adatbázison előre, kontrolláltan fel kell futtatni a felülvizsgált migrációkat; a meglévő migrációk teljes auditja külön munkacsomag.
- Később Auth + RBAC (user/organization/role), tanúsítható tenant-szűrés, auditnapló, rate limit, kulcsrotáció és esetleges gép–gép hozzáférés szükséges.
- A fejlesztési és production telepítést, CI/buildet, HTTP-integrációt és a tényleges adatbázis-migrációkat nem futtattuk.

## Ellenőrzés – lokálisan futtatandó
```bash
npm ci
npm run build -w apps/backend
node --test apps/backend/tests/foundation-security.test.cjs
node --test apps/backend/tests/environment-config.test.cjs apps/backend/tests/event-import-fields.test.cjs apps/backend/tests/event-viewport.test.cjs apps/frontend/tests/discovery.test.cjs
npm run build -w apps/frontend
```
Ezeket a GitHub-kódmódosító környezetben nem sikerült futtatni: a repo nincs klónozva és npm függőségei nem állnak rendelkezésre. A státusz ezért nem COMPLETED.

## Következő
1. Backend build és regression tests valódi workspace-ben; javítás, ha szükséges.
2. Átmeneti token megoldás leváltása szerepkörökkel és partner-tenant modellel a Momap Maps/Business előtt.
3. DB-migrációk/adatprovenance külön audit és biztonságos ütemezés.
4. Stabil térképes böngészős/mobile elfogadás; tile-provider váltás később.
