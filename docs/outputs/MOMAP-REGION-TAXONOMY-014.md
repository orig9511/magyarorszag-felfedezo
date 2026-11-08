# MOMAP-014 — Explicit pilot region and normalized POI taxonomy

Implemented:
- Reviewed-region registry with one Debrecen pilot bbox. MOMAP_INGESTION_REGION selects only registered regions; unknown values fail closed.
- OSM adapter uses selected bbox and validates returned coordinates against that bbox.
- OSM category mapping: restaurant, cafe, accommodation, attraction, museum, historic. Unsupported tags are skipped.
- Wikidata adapter is deliberately blocked before network access because its current P131 geographic query has not been validated; parser now has regional coordinate validation for a future reviewed query.
- Existing MOMAP_INGESTION_ENABLED gate and source-policy registry remain in effect. No adapter is approved for ingestion.

Outstanding:
- Do not assume a bbox identifies a settlement for regions crossing administrative borders; future regions require polygon/county spatial joins.
- Add Budapest and other regions only after validating their administrative geometry and source rights.
- Test categories against actual frontend filters, validate data ownership and attribution, add fixture tests.
- Review the Wikidata SPARQL query and WDQS service limits before allowing it.
- No scraper execution, DB operations, build, test, deployment or merge.
