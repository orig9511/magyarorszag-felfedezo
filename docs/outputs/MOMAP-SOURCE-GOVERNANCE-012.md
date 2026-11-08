# MOMAP-012 — Data source governance and QR sharing

## Data ingestion status
- Both adapters remain disabled by default through MOMAP_INGESTION_ENABLED.
- An additional source registry is fail-closed: osm_overpass and wikidata are NOT approved. The ingestion service calls assertSourceApproved before creating an ingestion job.
- Source approval is a technical control, not legal advice or permission. Review licensing, terms, robots rules, geographic scope, attribution, retention, correction and takedown for each source.
- OSM: ODbL obligations, visible map attribution and derivative database obligations require review. Prefer approved extracts rather than unrestricted bulk Overpass requests.
- Wikidata: structured data CC0, but linked images and third-party website content are not automatically CC0. Respect 429 and Retry-After; identify the client.
- Event pages and business websites: NO generic HTML scraping permission. Require an explicit licence/API/partner permission and a source-specific adapter.
- Privacy: avoid personal profiles, private addresses, and personal contact details in bulk collection. A public webpage does not mean all content is freely reusable.
- Remains unresolved: proper OSM XML/way parser, Wikidata geography query, deduplication, source review workflow, actual ingest history, integration tests, legal operator details.

## QR sharing
- Added client-side qrcode encoder and Angular QR component; public and partner published guides show a QR action.
- No third-party QR endpoint; data URL is generated locally, with PNG download.
- Only published guides expose QR in partner UI. QR points to the currently configured origin, so generate final printed codes only on the actual production domain.
- Dependency installation and lockfile update, builds and mobile QR scanning verification remain outstanding.

## Sources
- https://osmfoundation.org/wiki/Attribution_Guidelines
- https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline
- https://www.wikidata.org/wiki/Wikidata:Data_access
- https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual

No migrations, ingestion jobs, tests, builds, deployment or merges performed.
