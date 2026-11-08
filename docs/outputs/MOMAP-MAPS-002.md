# MOMAP-MAPS-002 – Multi-tenant persistence design (review-only)

Date: 2026-11-08. Branch: `feature/momap-foundation-001`.
Status: SQL DESIGN COMMITTED, NOT APPLIED. No database was accessed or modified.

## Deliverable
`apps/backend/src/migrations/proposals/003_momap_guides.sql` is an additive **proposal** with:
- `momap_organizations`: organization identity and globally unique slug.
- `momap_organization_memberships`: external authenticated subject, role `owner/editor/viewer`.
- `momap_guides`: one organization per guide, global public slug, brand, map camera, categories, draft/published state.
- `momap_guide_pois` / `momap_guide_events`: explicit curated many-to-many lists and sort order.
- FK constraints, numeric checks, uniqueness and indexes.

## Isolation and publishing
- Auth subject must come from a verified server-side session/JWT, never request body.
- Every write must check membership and role against the guide's organization ID; avoid IDOR.
- Public GET by slug must require `published=true` and only return projected public fields.
- A draft must return 404 rather than disclose its existence.
- The shared operator Bearer token from FOUNDATION-001 is **not** a partner authentication system.
- POI/event content may only be exposed if its licensing and publication status permit it; a guide relation does not grant rights to restricted content.
- `organizationId` is internal and must never be included in the public response.
- Limit guide content to 250 POIs and 250 events (contract currently validates these limits; DB enforcement is a separate transactional write-service responsibility).
- Public guide access should rate-limit and paginate/place caps before launch.

## Known gaps and migration risks
- Existing `pois`/`events` IDs and physical schema need read-only verification before migration. Prior SQL migrations and TypeORM entity naming are inconsistent; this file is not safe to run blindly.
- The proposal assumes `pois(id)` and `events(id)` are UUID PKs and `gen_random_uuid()` exists.
- `CREATE TABLE IF NOT EXISTS` does not validate a pre-existing table's schema. Migration runner should record a version and abort on unexpected drift.
- Existing schema migration `002_add_events_and_ingestion.sql` has potentially incompatible SQL constructs; do not infer the current DB shape from migration text.
- A single global slug avoids ambiguity; custom domains and aliases deferred.
- `logo_url` requires further host policy and fetch restrictions.
- Auth provider, user model, sessions, account recovery, role escalation policy, and tenant audit logs remain undecided.
- No RLS policies are provided; app-level isolation is necessary and must be verified by integration tests. RLS may be added as defense in depth once DB roles and connection strategy are known.

## Safe verification sequence (not performed)
1. Inspect the live database schema read-only, and back it up with a tested restore.
2. Confirm table names, PK types, `gen_random_uuid`, current migrations and owner privileges.
3. Review this SQL in a staging database; use migration version tracking and transaction.
4. Test membership/IDOR, published/draft visibility, FK deletion and duplicate slugs.
5. Only then explicitly authorize applying a reviewed migration to the intended environment.

## Next milestone
MOMAP-MAPS-003: authenticated tenant-scoped guide CRUD and read-only published public API, followed by Angular guest map route. No deployment or tile-provider change.
