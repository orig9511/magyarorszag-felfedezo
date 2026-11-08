# MOMAP-MAPS-003 – Backend guide API (2026-11-08)

Status: SOURCE IMPLEMENTED / BUILD, TEST, DATABASE INTEGRATION UNVERIFIED.

## Endpoints
- GET /api/guides/public/:slug – only published guides; 404 for drafts and missing slugs; public projection omits organization ID.
- GET /api/guides/operator/:id – operator-token protected.
- POST /api/guides/operator – operator-token protected, validates configuration and creates **draft only**.
- PUT /api/guides/operator/:id – operator-token protected, replaces **draft only**, cannot transfer ownership.

The operator endpoints are **not** a customer/partner login. They must not be exposed to partner browsers. Real tenant membership authorization remains a prerequisite for B2B launch.

## Database
Requires the proposed migration in `apps/backend/src/migrations/proposals/003_momap_guides.sql`. **That migration has not been applied.** Without it the new endpoints will return database errors. There is no deployment, seed, or database write in this GitHub change.

## Safety
- Parameterized SQL for values, fixed internal table names, transactional create/replace and link updates.
- Draft creation only; no publishing endpoint until license and visibility checks exist.
- UUID/slug validation, duplicate slug conflict, organization existence and immutable guide ownership.
- Explicit POI/event allowlists; FK constraints in proposed migration.
- No new dependency or map provider change.
- NOTE: public GET currently returns POI/event IDs only, not full POI/event content. Before enabling publishing, implement content visibility/license filtering and published content snapshots.
- NOTE: a public guide read is assembled with separate queries; future transaction/snapshot reads recommended for consistency under concurrent publication.

## Verification to run in cloned workspace
```bash
npm ci
npm run build -w apps/backend
node --test apps/backend/tests/guide-config.test.cjs apps/backend/tests/guide-schema.test.cjs apps/backend/tests/guides-api.test.cjs apps/backend/tests/foundation-security.test.cjs
```
No local build/tests were executed by the GitHub connector.
