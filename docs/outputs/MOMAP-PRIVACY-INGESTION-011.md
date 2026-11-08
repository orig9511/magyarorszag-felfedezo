# MOMAP PRIVACY / INGESTION-011 — audit and safety work

## Repository findings (source inspection, not runtime verification)
- OSM adapter queries only a fixed Debrecen bbox and parses only XML nodes using regex; ways and XML escaping are not handled properly.
- Wikidata adapter has a questionable P131/Q28 geographic filter, fixed settlement 'Debrecen', and hard-coded LIMIT 100.
- The ingestion service previously used SQLite-style '?' placeholders inside PostgreSQL/PostGIS raw queries; changed to $1/$2/$3 and ST_MakePoint.
- POI imports previously dropped attribution, license and source URL even though the entity has attribution and externalRefs; now stored.
- Adapter HTTP failures previously returned empty arrays, which could be recorded as successful zero-item jobs; now fail explicitly.
- Daily OSM and weekly Wikidata cron methods exist, but **no proof of successful execution**; no runtime, history endpoint or DB inspected.
- Scheduler and manual ingestion are now disabled unless MOMAP_INGESTION_ENABLED=true. **Keep false**: this is a safety stop, not approval to resume scraping.
- There is still no proper rights registry, robots/ToS per-site review, content takedown workflow, regional scope validation, ingestion provenance audit or source refresh policy.
- A recognized license string alone does not establish that a particular dataset can legally be reused. License obligations and source rights must be checked individually.

## Privacy UX
- Global consent banner with equally accessible reject, accept, and settings; consent preference saved locally.
- Three draft legal routes: /adatvedelem, /sutik, /impresszum; visible footer links.
- The drafts intentionally disclose missing operator identity, retention and processor details; **not legally complete**.
- Ads and analytics remain disabled. No third-party tracking SDK or Google AdSense script is loaded by these changes.
- This local consent banner is NOT a Google-certified IAB TCF CMP. Do not use it as a substitute for a certified CMP for AdSense.
- For production: inventory actual cookies, map tiles and logs; fill controller/operator details; assess lawful bases and retention; processor agreements; consent revocation integration; legal review.

## QR status
- The previous SHARING-010 package implemented native sharing and clipboard copying.
- QR generation was requested but is not part of this package; choose a vetted local/offline QR encoder and lock dependencies before claiming it works. Avoid sending private guide URLs to third-party QR APIs.

## Sources
- Google AdSense certified CMP: https://support.google.com/adsense/answer/13554116
- OSM Nominatim public service policy: https://operations.osmfoundation.org/policies/nominatim/
- OSM attribution: https://www.openstreetmap.org/copyright

No DB operations, builds, tests, scraper runs, deployments or merges performed.
