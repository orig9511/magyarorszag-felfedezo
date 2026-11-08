# MOMAP-MAPS-001 – Partner guide contract

**Date:** 2026-11-08  
**Branch:** `feature/momap-foundation-001`  
**Status:** CODE ADDED / BUILD & TEST UNVERIFIED

## Decision

The existing Angular/MapLibre/NestJS/PostGIS stack stays in place. The tile provider is not changed. This phase defines a **storage-independent public-guide configuration contract**, not a live B2B API, tenant store, or subscription product.

## Added files

- `apps/backend/src/modules/guides/guide-config.ts`: validated map configuration, brand, selected POI/event IDs, publication state, organization reference, safe public projection.
- `apps/backend/tests/guide-config.test.cjs`: validation and publication/privacy regressions.

The contract deliberately **does not** attach to existing POI.ownerId or Event.ownerId. Ownership and inclusion in a curated guide are different relationships; a guide may reference publicly licensed attractions not owned by the hotel.

## Next implementation gates

1. **Build and tests**: run `npm ci`, `npm run build -w apps/backend`, `node --test apps/backend/tests/guide-config.test.cjs apps/backend/tests/foundation-security.test.cjs`. These were not executed in the GitHub-only environment.
2. **Persistence design + migration review**: `organizations`, `organization_memberships`, `guides`, `guide_pois`, `guide_events`. Verify existing database schema and naming before writing migrations. Do not run any DB changes without backup and explicit authorization.
3. **Auth and tenant isolation**: partner JWT/session, organization membership, owner-only updates; never use the interim shared operator token for partner accounts.
4. **Read-only public guide endpoint**: resolve published slug, enforce explicit allowlists and publication state, return safe projection; do not expose private organization metadata.
5. **Angular guide view**: separate lazy-loaded route, use MapLibre and configurable map style, respect attribution.
6. **Production provider choice**: tile-provider change later, based on license, availability and costs.

## Risk register

- No real tenant isolation until auth, persistence and authorization exist.
- No claim of production readiness; tests, TypeScript build and DB integration remain UNVERIFIED.
- A selected POI/event must also satisfy its own visibility/licensing policy.
- Uploaded logo URLs may need an image proxy or strict host allowlist before serving untrusted content.
