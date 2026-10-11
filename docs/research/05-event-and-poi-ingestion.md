# Event & POI Data Ingestion Strategy

> **Status:** PROPOSAL. The user has not approved it. It was revised by the verification pass on 2026-10-11 (see the "Verification log (2026-10-11)" section at the end of this file).
> **Evidence tags:** VERIFIED, INFERRED, UNVERIFIED, and BLOCKED, as defined in `.claude/CLAUDE.md` §6. Sources are listed in [`_sources-geo.md`](_sources-geo.md).
> **Binding constraints:** solo developer; a running cost of about €20–50/month; EU hosting; proprietary code; TREK, TRIP, Mobilizon and Tokoro are reference-only; launch in Debrecen / Hajdú-Bihar first, then Budapest.
> **Method rule:** this pass read only terms, imprints, robots.txt files and documentation. **Nothing was scraped.**

---

## 1. Key finding

The earlier draft's heading, "Approved Free Data Sources (All Commercial-Use Compliant)", was **wrong**. Only the **open-data** sources (OSM, Wikidata and Lechner boundaries) have verified reuse licences. **None of the Debrecen, Hajdú-Bihar or national tourism event sites checked publishes an API, a feed or an open licence.** At least one of them, debrecen.hu, explicitly **prohibits** storing or processing its content without written consent. In the MVP, events therefore have to come from **(a) manual editorial entry, (b) organisers submitting their own events, or (c) written data-sharing agreements**, not from automated crawling.

---

## 2. Source assessment: Debrecen and Hajdú-Bihar (priority 1)

| Rank | Source | Operator | Data | API / feed | Terms / licence | robots.txt | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **OpenStreetMap** (Geofabrik extract) | OSMF / contributors | POIs (amenity, tourism, historic…) | Planet and Geofabrik extracts; Overpass API, for which public-instance limits apply | **ODbL 1.0** (VERIFIED). Share-alike risk if merged with proprietary data (see §4) | `www.openstreetmap.org` asks bulk users to use the planet or extracts; Overpass `/api/` is disallowed for crawlers, and API use falls under the Overpass usage guidance | **Use**, for POIs, kept in separate provenance (VERIFIED) |
| 2 | **Wikidata** | Wikimedia | Museums, monuments, venues, with Q-ids and links | SPARQL (WDQS): 60 s timeout, 5 parallel queries per IP, descriptive User-Agent required; dumps for bulk | Structured data is **CC0** (VERIFIED); linked images on Commons are licensed separately (UNVERIFIED) | `/sparql` disallowed for crawlers; API use under the WDQS user manual | **Use**, for enrichment and cultural POIs (VERIFIED) |
| 3 | **Lechner INSPIRE administrative units** | Lechner Tudásközpont | County, járás and settlement polygons | ATOM / WFS / SHP download | **CC BY 4.0** per the metadata (VERIFIED) | n/a | **Use**, for boundaries (see 04 §1.2) |
| 4 | **visitdebrecen.com** (Tourinform Debrecen) | Debrecen tourism agency (INFERRED from the Tourinform contact `debrecen@tourinform.hu`, Piac u. 20; the legal entity name is not shown on the site, so UNVERIFIED) | Tourism news, "Hot now" programmes | **None found** (it is a WordPress site; its REST API was deliberately not probed) | **No reuse terms**, only "© 2026 visitdebrecen". Default copyright applies, so INFERRED: **permission needed** | Only `/wp-admin/` disallowed | **Best partnership target.** Request a feed or written permission |
| 5 | **debreceniprogramok.com** | Not identified. The site footer says "© Debreceni Programok. Minden jog fenntartva"; the developer is PW Studio, which also built the "Debrecen Events" app linked from visitdebrecen.com | City events calendar. debrecen.hu's "Események a héten" page **302-redirects here** (VERIFIED) | **None found** | "All rights reserved" (VERIFIED) | Only `/ajax/` disallowed | Likely the de facto official calendar (INFERRED). **Permission or agreement needed** |
| 6 | **debrecen.hu** | Debrecen Megyei Jogú Város Önkormányzata (VERIFIED, impresszum) | Municipal news and links | **None found**; `/robots.txt` and `/rss` both return 404 | Impresszum (VERIFIED): content may be reused **only with a source reference**, and **"Tilos az oldalon szereplő tartalmak elektronikus tárolása, bármilyen formátumban történő feldolgozása"** without prior written consent | No robots.txt (404) | **Do not ingest** without written consent |
| 7 | **hajduszoboszlo.hu** | Hajdúszoboszlói Turisztikai Közhasznú Nonprofit Kft. (per its privacy policy, VERIFIED) | Events ("Városi rendezvények", `/program/`) | **None found** | No reuse terms published, so default copyright applies (INFERRED) | Only `/wp-admin/` disallowed | Partnership target for phase 1b |
| 8 | **visithungary.com** | Visit Hungary National Tourism Organisation Ltd. / Hungarian Tourism Agency (VERIFIED, impressum) | National events calendar (`/collection/events`) | A `/publicapi/` path exists but is **disallowed in robots.txt** and undocumented (VERIFIED) | No reuse terms found on the impressum; "© 2012-2026 Hungarian Tourism Agency" | `Disallow: /publicapi/` | **Do not use** the undocumented API. Ask through the B2B channel |
| 9 | **kozadatportal.hu** (Nemzeti Közadatportál, NAVÜ Kft.) | NAVÜ Kft. (VERIFIED, disclaimer page) | National open-data catalogue (CKAN). A search for "Debrecen" found only **KSH Debrecen weather data, licensed CC Non-Commercial**; "turizmus" found 2 KSH statistical sets | CKAN API exists, **but robots.txt disallows `/api/`** and sets Crawl-Delay 10 | Licence is set per dataset; portal content is NAVÜ IP by default | `Disallow: /api/` | **No relevant event or POI data found** (VERIFIED for these searches) |
| — | **data.gov.hu** | — | — | — | — | — | **BLOCKED.** The host resolves but refuses connections on 80 and 443. The current national portal appears to be kozadatportal.hu (INFERRED) |
| — | **kulturinfo.hu** | — | — | — | — | — | **BLOCKED / removed.** HTTPS refused and HTTP returned 403. The earlier claims ("CC-BY", "SPARQL endpoint", "official ministry") are **unsupported** |
| — | Hortobágyi Nemzeti Park (hnp.hu), Hajdú-Bihar county portal | — | — | — | — | hnp.hu has no robots.txt (serves an HTML page); a county tourism portal was not found | **UNVERIFIED.** Check in a later pass |

**Ranking rationale (INFERRED):**
- Sources 1–3 are usable now under verified licences.
- Sources 4–5 are the most valuable for *events* in Debrecen, but need a written agreement. visitdebrecen.com comes first because a Tourinform office has a public mission to promote tourism, which makes it the most likely partner.
- debrecen.hu's terms are the most restrictive found.

## 3. Budapest sources (priority 2; partially checked)

| Source | Finding | Tag |
|---|---|---|
| **budapestinfo.hu** (official tourism site) | robots.txt allows everything. The page is client-rendered, so WebFetch could not read the operator, terms or calendar | robots VERIFIED; terms **BLOCKED** |
| **budapest.hu** (Főváros) | robots.txt allows `/`, with one civil-database path disallowed. Terms and APIs not checked | robots VERIFIED; terms UNVERIFIED |
| opendata.budapest.hu | No DNS record (NXDOMAIN) | VERIFIED (domain does not resolve) |
| port.hu (commercial listings) | robots.txt blocks `/jegymester/`, `/ticketlist/` and others, and blocks `anthropic-ai`, `GPTBot`, `CCBot` and other AI crawlers entirely; it is a commercial aggregator | VERIFIED. **Do not use** |
| OSM, Wikidata | Same as for Debrecen | VERIFIED |

## 4. Licence-driven ingestion rules (PROPOSAL)

1. **Keep OSM data separate (VERIFIED basis: OSMF Collective Database Guideline).** Store OSM POIs with `source='osm'` and `source_id` (`node/123`). **Do not merge or de-duplicate them into editor-owned or partner records.** The guideline explicitly says that merging a proprietary list with OSM data and removing duplicates is *not* covered by its safe harbour, so the proprietary data "may be subject to ODbL share-alike". Show OSM and editorial records side by side; a "suppress duplicate in UI" link table is acceptable only if it fits the guideline's reference rules (**legal review**).
2. **Wikidata (CC0)** may be merged freely. Still keep `source='wikidata'` and the Q-id for provenance.
3. **Partner and organiser data:** store the agreement reference, licence scope (display, cache, retention), `retrieved_at`, and the moderation status.
4. **Images:** never copy images from any site, including Commons, without a per-image licence record (CLAUDE.md §7).
5. **Respect API policies:** use a descriptive User-Agent with a contact address. Use the Geofabrik extract rather than Overpass for bulk loads. Run WDQS queries at most daily and keep them small. Never call APIs disallowed in robots.txt (visithungary `/publicapi/`, kozadatportal `/api/`) without permission.

## 5. Architecture corrections

- **Stack mismatch (VERIFIED from the earlier draft):** the earlier draft used **Python/Celery** code with `fuzzywuzzy` and `sklearn`, while 03 proposes **NestJS/TypeScript**. For a solo developer, run the ingestion jobs **inside the NestJS app**, using a Postgres-backed queue such as `pg-boss` or `@nestjs/schedule` cron jobs, rather than adding Celery and Redis (INFERRED; these libraries were not verified here).
- **`fuzzywuzzy`** is GPL-2.0 licensed. That licence is INFERRED from general knowledge and was not verified in this pass, so check it before any use. The Python sample has been removed in any case.
- **Mobilizon ingestion removed.** The instance `mobilizon.hu` **does not resolve** (VERIFIED: NXDOMAIN). The `GET /events` ActivityPub endpoint and "orderedItems" response were never verified. Running or depending on Mobilizon conflicts with the reference-only decision unless the user explicitly approves consuming third-party instance feeds.
- **De-duplication (INFERRED design):** use PostGIS `ST_DWithin` (for example, 50–100 m) combined with trigram name similarity (`pg_trgm`), *within* the same source family. Across OSM and non-OSM data, apply rule 1 in §4. The earlier pure-Python O(n²) loop has been removed.
- **Staleness (INFERRED):** events whose `end_time` has passed should become non-visible at once, not after 30 days. An HTTP 404 from the source does **not** mean an event was cancelled. Flag such events for moderation instead.

## 6. GDPR items (move to 06-security-and-operations when it is written)

Corrections to the earlier draft (INFERRED from GDPR principles, not legal advice):
- "Audit logs older than 3 years (GDPR minimum retention)" is **wrong**. GDPR sets no minimum retention period; it requires storage limitation, so retention periods must be justified and documented. Pick the periods with legal input.
- Logging every `poi_view` with a `user_id`, IP address and user agent conflicts with data minimisation. Use aggregate, anonymous counters instead.
- The earlier code labelled a TypeScript controller as `python` and erased accounts on a `DELETE` request reached through an emailed link. Those details belong to implementation design in 06, and the sample has been removed.

## 7. Effort and cost (PROPOSAL)

- **Data licence cost:** €0 for OSM, Wikidata and Lechner INSPIRE (VERIFIED licences). Partner agreements cost an unknown amount (UNVERIFIED).
- **Effort (relative):** OSM + Wikidata import is **low–medium**; the editorial and organiser submission flow with moderation is **medium**; partner feeds are **medium per partner**, plus non-technical negotiation.
- The earlier figures ("3-4 weeks", "~4 hours/month", "€0/month operational") were unsourced and have been withdrawn.

---

## Verification log (2026-10-11)

**Method:** read robots.txt files with curl, using a descriptive User-Agent. Read home, imprint and terms pages through WebFetch. Ran 2 Wikidata `wbgetentities`/`wbsearchentities` API lookups to verify Q-ids. Made **3 CKAN `package_search` calls to kozadatportal.hu before reading its robots.txt, which disallows `/api/`.** The calls were made in error, and no further API calls followed; the website search page was used afterwards. No crawling or bulk download of event or POI content took place.

| # | Earlier claim | Result |
|---|---|---|
| 1 | "All commercial-use compliant" free sources | **Wrong.** Only OSM, Wikidata and Lechner have verified open licences; the tourism sites are all-rights-reserved or have no terms |
| 2 | kulturinfo.hu: CC-BY with an API | **Unsupported.** The site is unreachable (BLOCKED) |
| 3 | Mobilizon federation, `mobilizon.hu`, licence "Varies", "commercial YES" | **Wrong.** The domain doesn't exist and the endpoint is unverified; removed |
| 4 | Wikidata attribution "optional" | **Confirmed.** CC0 structured data (VERIFIED) |
| 5 | OSM "commercial use YES, attribution" with no share-alike caveat | **Incomplete.** Added the Collective Database Guideline restriction on merging and de-duplication (VERIFIED) |
| 6 | Python/Celery workers | **Inconsistent** with the proposed NestJS stack; replaced with an in-app job runner proposal (INFERRED) |
| 7 | Overpass full-Hungary bbox query run daily | **Discouraged.** Overpass guidance points heavy and app users to their own instance or extracts (VERIFIED); use Geofabrik |
| 8 | WDQS `?item wdt:P131* wd:Q28` over all of Hungary | Can exceed the 60 s timeout (INFERRED); split the query by county |
| 9 | GDPR "3-year minimum retention" | **Wrong** (INFERRED, GDPR text not re-read in this pass) |
| 10 | Effort and cost figures | **Unsourced, withdrawn** |

**BLOCKED:** data.gov.hu (connection refused), kulturinfo.hu (refused / 403), budapestinfo.hu terms (client-rendered), visitdebrecen.hu (connection refused; the working site is visitdebrecen.com).
**UNVERIFIED:** the legal entity behind visitdebrecen.com and debreceniprogramok.com; the Hortobágy NP and county portal terms; budapest.hu terms; Commons image licences; the `pg-boss` and `pg_trgm` licences; the `fuzzywuzzy` licence.
