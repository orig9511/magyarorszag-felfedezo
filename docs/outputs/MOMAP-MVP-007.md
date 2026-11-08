# MOMAP MVP-007 — One-batch source implementation (no DB, no debugging)

## Scope implemented
- Partner POI/event catalog search: GET /api/partner/catalog?kind=poi|event&q=&lng=&lat=&radiusKm=&limit=.
- Radius and result limits, basic public-source/event filters, authentication required.
- MapLibre map preview and clickable POI/event selection in the Angular partner editor; manual UUID mode retained.
- Admin guide moderation queue and publish/unpublish controls in the existing Access dashboard.
- Server-side admin-only publication transitions and basic eligibility check for linked public-source POIs and licensed events.
- Authentication endpoint single-process request throttling.
- Regression test source for moderation/catalog permissions.

## Scope explicitly excluded by request
- NO database operations, schema migration application or DB integration.
- NO debugging, build, test execution, deployment, PR merge.

## Critical limitations
- These are source changes, **not a verified working application**.
- Existing proposed 003/004 schema has not been applied. Without it, the new features cannot run end-to-end.
- Publication checks are a first-pass metadata gate, NOT legal editorial/license review. Admin must manually verify content rights and attribution before publishing.
- Moderation actions currently have no durable audit log (would require approved persistence); don't expose to production.
- Throttle is in-memory and single-instance, NOT distributed rate limiting; proxy configuration and abuse protection still required.
- No verified email ownership, reset flow, admin MFA or independent security audit. Registration must remain closed to public traffic.
- Guide selection UI uses MapLibre with the existing development tile provider. Commercial tile policy must be resolved before launch.
- A QR code generator, payments and advanced analytics are out of scope for this batch.
- Manual confirmation dialogs are not an alternative to audit trails or content moderation policy.
- No claims of build/test pass or runtime correctness.

## Future integration/debug phase
1. Review physical schema and 003/004 migrations, backup and staging.
2. Build backend and frontend, run Node/Jest tests and fix TypeScript errors.
3. Validate search, guide selection, approval, publication and public display with seeded data.
4. Review all authentication and publication security controls.
5. Mobile browser tests and tile provider policy.
