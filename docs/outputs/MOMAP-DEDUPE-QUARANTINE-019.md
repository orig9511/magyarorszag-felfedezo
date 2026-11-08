# MOMAP-019 — Event deduplication and quarantine

- Existing same-source (source,sourceId) uniqueness remains the primary identity.
- Cross-source duplicate detection uses conservative SHA-256 fingerprint: normalized title + Europe/Budapest calendar day + normalized venue.
- Candidate lookup is bounded to the same county and +/- 24 hours; exact fingerprint matches are skipped before inserting.
- Missing venue or short title blocks automatic event ingestion, rather than risking a city-level false merge.
- Existing admin-token-protected PATCH /api/events/:id/quarantine sets status=draft; PATCH /api/events/:id/restore restores draft to active.
- Active event map queries already exclude draft status.
- No deletion of possible duplicates, and no automatic merge of event source rights/attributions.
- False/uncertain records and POIs still require a fuller moderation queue, POI visibility status and reviewed schema migration.

Important limitations: no concurrency-safe unique cross-source fingerprint DB constraint yet; candidate cap 500 can miss matches; title/day/venue equality is not proof of identity, and distinct performances at the same venue/day may collide. A future persisted review queue with canonical IDs, source provenance, and human approval is recommended.

All scraping remains disabled/unapproved. No tests, builds, DB operations, migrations, scraping, deployment or merge performed.
