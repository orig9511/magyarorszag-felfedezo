# MOMAP-MAPS-003 – Large implementation checkpoint

Status: CODE COMMITTED; BUILDS / TESTS / DATABASE / BROWSER UNVERIFIED.

## Delivered
- Backend GuidesModule, GuidesController and GuidesService registered in AppModule.
- Public GET /api/guides/public/:slug returns only published guide configuration.
- Operator GET/POST/PUT routes require AdminTokenGuard. POST and PUT accept drafts only; cannot publish, transfer organization or edit published guides.
- Parameterized SQL and transactional draft writes/curated POI-event relations.
- Angular lazy-loaded /g/:slug guest map using existing MapLibre map style and published guide map camera.
- Regression test source for guard, invalid slugs, draft visibility and operator publishing restrictions.
- Existing MapLibre and tile provider unchanged. No DB migration, deployment or seed executed.

## Important limitations
- Requires **unapplied** `apps/backend/src/migrations/proposals/003_momap_guides.sql`; guide API will not function on an unchanged DB.
- The guest page is read-only and shows the map/branding only. It does not render curated POI/event markers because the public endpoint currently returns only IDs.
- The operator shared token is not a B2B user login. Never embed it in Angular or distribute to partner customers.
- Publication deliberately blocked until licensing, source visibility, role-based access and auditing are implemented.
- No production readiness or test pass claimed. Must run build and integration checks.
- Review data ownership and existing physical schema before approving any SQL.

## Local validation
```bash
npm ci
npm run build -w apps/backend
npm run build -w apps/frontend
node --test apps/backend/tests/guide-config.test.cjs apps/backend/tests/guide-schema.test.cjs apps/backend/tests/guides-api.test.cjs apps/backend/tests/foundation-security.test.cjs
```
Do not run SQL against the existing DB without separate explicit authorization and backup verification.
