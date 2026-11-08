# MOMAP-016 — Ingestion unit-test foundation

Added isolated Jest/ts-jest specifications:
- POI category normalization and rejection of unsupported OSM tags.
- Region registry default, unknown region rejection, bounding-box boundary and invalid coordinate handling.
- PostGIS spatial county resolver: one match, no match, shared boundary and invalid coordinates.
- Backend jest.config.cjs configured for TypeScript specs.

Run later, from repository root:
```bash
npm install
npm run test -w apps/backend -- --runInBand
npm run build -w apps/backend
```

Important: these are mocked unit tests. They do NOT prove real PostGIS geometry validity, SRID, schema, spatial index, or end-to-end import behavior. Full DB integration tests and fixture-based OSM/Wikidata parsing tests are still needed.

All scraper sources remain disabled and unapproved. No tests, builds, DB operations, ingestion, deployment or merges were executed.
