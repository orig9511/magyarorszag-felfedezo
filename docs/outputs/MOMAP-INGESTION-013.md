# MOMAP INGESTION-013 — Source-level hardening

Changes:
- Overpass OSM adapter requests JSON rather than XML, parses named node/way elements with coordinates/centers, validates coordinates and deduplicates by OSM type + ID.
- PostgreSQL create-path geometry SQL placeholders fixed for events. POI creates now supply required GeoJSON Point geometry during insert, rather than saving without non-null location and patching later.
- POI source URL, attribution, license and coordinate validation added to match event checks.
- Wikidata malformed response handling now fails rather than silently succeeding with zero records.
- Source approval registry remains fail-closed and MOMAP_INGESTION_ENABLED remains false by default.

Known blockers:
- OSM bbox and settlement still hard-coded to Debrecen; no nationally scoped ingestion.
- Wikidata P131/Q28 geographic scope and fixed settlement are unverified.
- OSM category taxonomy is not normalized to Momap UI categories.
- Overpass is not approved for production bulk harvesting; prefer properly licensed regional extracts and usage review.
- OSM/Wikidata source licenses and external media rights require individual review.
- Existing events may require explicit coordinates and source review.
- No source jobs run, database touched, tests/builds executed, deployments or merges performed.

Follow-up: configurable regional import and source-rights registry backed by reviewed documentation; fixture-based adapter tests; DB integration checks.
