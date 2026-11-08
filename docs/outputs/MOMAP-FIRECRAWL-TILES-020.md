# MOMAP-020 — Firecrawl ticket events, human moderation and deployable basemap

## Map provider decision (2026-11-08)
**Selected initial basemap: OpenFreeMap Liberty vector style**, via MapLibre:
`https://tiles.openfreemap.org/styles/liberty`.

Evidence:
- https://openfreemap.org/ — keyless hosted map, explicitly permits commercial use; no stated map-view/request cap; best-effort, **no SLA**.
- https://openfreemap.org/tos/ — source terms and limitations, updated 2026-10-14.
- https://openfreemap.org/quick_start/ — official style URL and instructions.
- https://protomaps.com/ — planned fallback: self-hosted Hungary PMTiles subset on range-request-compatible object storage. The format/software is free; storage, CDN and operations can still cost money. Hosted Protomaps commercial API is separate.
- https://www.maptiler.com/terms/cloud/ — MapTiler Free is restricted to non-commercial work/R&D; not the free commercial default.
- https://operations.osmfoundation.org/policies/tiles/ — avoid using OSMF volunteer-funded raster tiles as the long-term high-traffic commercial delivery infrastructure.

No tile prefetching or bulk download was performed. Retain OpenStreetMap/OpenMapTiles/OpenFreeMap attribution and confirm any changed provider terms before launch.

## Firecrawl v2 ingestion design
- Discovery-only registry: Jegy.hu, Cooltix and Eventim; **all unapproved**, with no seed URLs. Public listings are not a republication licence.
- Dual policy gates: `SOURCE_POLICIES.firecrawl_ticket.approved` AND each `TICKET_SOURCES[id].approved`, plus documented source-specific licence and review date. Discovery needs another independently reviewed scope.
- Protected entrypoint `POST /api/ingestion/run?source=ticket`; existing operator guard applies, and global ingestion enablement must also be true.
- Optional approved-domain discovery via Firecrawl `POST /v2/map`, filtering URL hostname, HTTPS and permitted event-detail paths; **at most 20 page scrapes per invocation** with 750ms pacing and a 20s timeout per request.
- Details fetched with Firecrawl `POST /v2/scrape`; HTML parsed for schema.org JSON-LD Event and event subtypes. Strict event/title/venue/locality/timezone validation; event geo extracted where present.
- Tracking parameters stripped, stable per-occurrence source IDs, existing cross-source dedupe improved to distinguish same-day separate showtimes.
- Candidates saved as `draft`; admin-only review requires geographic coordinates and a future date before publishing. Re-ingestion preserves existing moderation status.
- Source publication rights, copyright, reuse of descriptions/images, ticket links and attribution **must be reviewed for every site**, independently of Firecrawl technical capability.

Technical references:
- https://github.com/firecrawl/firecrawl-docs/blob/main/advanced-scraping-guide.mdx
- https://github.com/firecrawl/firecrawl-docs/blob/main/features/map.mdx
- https://support.cooltix.com/hu/articles/12276922-cooltix-es-esemenyek-adatainak-lekerdezese (API access to other organizers' events requires agreements).

**Important:** Scraping ticket pages is not authorized merely by a visible event page, sitemap, JSON-LD, robots permission, or possession of Firecrawl credits. Currently all listed ticket sources are blocked by policy. Firecrawl calls incur credits if later enabled.

## Moderation
- Proposed migration `apps/backend/src/migrations/proposals/007_momap_content_review.sql`: POI `moderationStatus` and admin audit table. **Not applied.**
- `/access/admin`: pending event approval/rejection, source link, missing-location warning and disabled approval without location; suspicious/quarantined POIs with quarantine/restore actions.
- Backend review endpoints require Access admin identity and record audit actions. Public POI viewport/detail and published guest guides filter quarantined POIs; public event feeds/details filter drafts, rejected records and ended events.
- The retention task excludes quarantined POIs. Hard deletes remain opt-in and disabled.
- Fictitious or duplicate events are not proved by scraping alone: automated heuristics can produce both missed matches and false positives, requiring human review. Database-level concurrency-safe dedupe remains a separate release gate.

## Activation gates (do not skip)
1. Source-by-source written permission and licence confirmation, plus access and publishing rights; maintain source register and approved page paths.
2. Staging database backup, apply and verify `007` proposal, check guide references and audit table/permissions.
3. Run `npm ci`, backend/frontend builds and unit + integration tests, review TypeScript/Angular/SQL errors and lockfile.
4. Validate Firecrawl v2 payloads and source markup on allowed fixtures, credential storage, credit budget, quota/rate limits, URL allowlist, no arbitrary SSRF.
5. Test duplicate concerts on same day at different times, timezones/DST, geo missing or wrong, expired events, guest guide visibility and partner authorization.
6. Check map attribution, mobile performance, provider outage fallback, map style/theme, CSP and third-party request disclosures.
7. Enable source flags only after explicit operator approval; do not enable scheduled scraping or production cleanup automatically.

Source-only work. No build, tests, database operations, migration, live ticket scraping, deployment or merge performed.
