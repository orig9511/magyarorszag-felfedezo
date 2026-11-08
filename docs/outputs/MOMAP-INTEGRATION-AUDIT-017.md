# MOMAP-017 — Static integration audit

## Corrected
- Angular access guide-editor routes are now explicitly ordered before the generic /access/:vertical route.
- Event geometry is saved atomically using TypeORM GeoJSON Point rather than saving and then issuing raw SQL.
- Updates without new coordinates preserve existing event geometry.

## Observed, not yet resolved
1. Frontend qrcode and @types/qrcode dependencies were added in PR #10 without an updated root package-lock.json. Reproducible npm ci will need lockfile reconciliation.
2. Legal pages are drafts; operator identity, retention, processors, cookie inventory and certified CMP (if advertising is enabled) require completion.
3. Source approval registry deliberately blocks OSM and Wikidata; ingestion is not production-ready.
4. Wikidata query is explicitly blocked pending geographic and rights review.
5. OSM pilot region uses a rectangular bbox and provisional settlement; PostGIS county lookup validates county, but settlement labels are not reverse-geocoded.
6. No DB schema/geometry/indices have been verified against an actual running database.
7. Existing unit tests are mocks, not DB integration tests.
8. QR download must be tested on iOS and with the final production origin; localhost codes must not be printed.
9. Review NestJS scheduler timezone, API auth/roles, CORS, consent behavior and API response contracts during final integrated verification.
10. The current PR chain is stacked; merge or rebase carefully in dependency order, and inspect all GitHub checks before release.

## Release gate
Run dependency installation with lockfile reconciliation, TypeScript builds, Jest tests, Angular build, staging DB migration/schema checks, API smoke tests, manual iPhone UX, security/privacy review and approved-source dry runs. Do not enable ingestion or ads before their respective approvals.

No tests, builds, DB operations, scraping, deployment or merges performed in this PR.
