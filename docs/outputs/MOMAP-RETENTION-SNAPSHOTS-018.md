# MOMAP-018 — Data retention and snapshot delivery

## Implemented
- Operator-protected read-only GET /api/ingestion/retention/preview counts eligible cleanup candidates.
- Optional daily 04:00 UTC retention task, disabled unless MOMAP_RETENTION_DELETE_ENABLED=true.
- Cleanup runs bounded batches of at most 100 records per category per run, deleting only imported unowned OSM/Wikidata events/POIs.
- Expired imported events are eligible 30 days after their end time (or start if end is absent).
- Invalid imported records are eligible only for objectively missing essential fields (empty name/title, missing provenance, missing location). Automated checks **cannot establish that a venue/event is fictitious**. Such reports need a moderation/verification process.
- Public viewport API responses include short HTTP cache hints; frontend holds 5-minute per-viewport in-memory snapshots. No WebSocket or continuously open API connection is introduced.
- Cron schedules explicitly UTC.

## Critical limitations before enabling
- Hard deletes can violate foreign keys, guide references and audit requirements; verify dependencies and introduce soft-delete/quarantine and approved retention policy first.
- Review SQL against the deployed schema; TypeORM naming strategy and actual column names must be checked.
- Event expiration uses Budapest-local timestamp columns; timezone behavior requires integration tests.
- Snapshot data is not a pre-generated static tile set: viewport/filter changes still make HTTP requests.
- Five-minute frontend cache and 30/60-second HTTP cache have different lifetimes.
- No mechanism yet verifies false or duplicate real-world events. Never auto-delete on heuristic suspicion.
- No build, test, DB operation, cleanup run, deployment or merge performed.

## Release gates
Keep MOMAP_RETENTION_DELETE_ENABLED unset. Verify read-only preview in staging, FK dependencies, backups, privacy/retention policy, guide references, and explicit operator approval before considering activation.
