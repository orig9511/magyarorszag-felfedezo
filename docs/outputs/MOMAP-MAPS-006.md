# MOMAP-MAPS-006 – Curated public map content

Status: SOURCE COMMITTED / BUILD, TESTS AND DATABASE INTEGRATION UNVERIFIED.

## Delivered
- GET /api/guides/public/:slug/places
- Queries explicitly linked POIs and events for published guides only.
- Event visibility: active, non-test, recent/upcoming, public-license allowlist and geolocated.
- POI visibility: known imported public sources (osm/wikidata/lechner) and geolocated. **This is not sufficient proof of image/content licensing.**
- Returns limited public fields and map coordinates, not ownership/partner records.
- Angular guest map now renders clickable MapLibre markers, a scrollable place list, category filters and safely constructed DOM popups.
- No new map engine or tile provider. No database migration applied, no deployment.

## Outstanding critical gates
1. Schema audit: TypeORM camelCase physical columns versus legacy SQL migrations.
2. Verify content/image license and attribution per record; do not assume source alone grants redistribution.
3. Implement approved publishing workflow with an audit log and tenant-level moderation.
4. Implement editor POI search and selection UI (currently UUID input only).
5. Run build/tests and integration tests in a real database before merging.
6. Add HTTP cache/rate limits, privacy/analytics policy and mobile accessibility checks.
7. Registration/login hardening remains required; no production launch.

## Validation commands
```bash
npm ci
npm run build -w apps/backend
npm run build -w apps/frontend
node --test apps/backend/tests/guide-content.test.cjs apps/backend/tests/partner-guides.test.cjs apps/backend/tests/access.test.cjs
```
