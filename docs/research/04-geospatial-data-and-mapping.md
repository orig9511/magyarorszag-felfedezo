# Geospatial Data & Mapping Strategy

> **Status:** PROPOSAL. The user has not approved it. It was revised by the verification pass on 2026-10-11 (see the "Verification log (2026-10-11)" section at the end of this file).
> **Evidence tags:** VERIFIED, INFERRED, UNVERIFIED, and BLOCKED, as defined in `.claude/CLAUDE.md` §6. Sources are listed in [`_sources-geo.md`](_sources-geo.md).
> **Binding constraints** (approved MVP decisions, 2026-10-11): solo developer, a running cost of about €20–50/month, EU hosting, proprietary platform code, and launch in Debrecen / Hajdú-Bihar first, then Budapest.

---

## 1. County and settlement boundaries

### 1.1 OpenStreetMap (ODbL 1.0)

- **VERIFIED.** In OSM's Hungarian tagging scheme, counties and the capital are `admin_level=6` ("Megyék / főváros", NUTS 3). The full scheme is: 4 = NUTS 1 groups of regions, 5 = NUTS 2 regions, 7 = járások, 8 = települések, 9 = Budapest kerületek, 10 = városrészek. Source: OSM wiki, `Tag:boundary=administrative`, country table. **The earlier draft used `admin_level=4`, which is wrong.** That level returns NUTS 1 statistical regions, not counties.
- **VERIFIED by an executed query.** On 2026-10-11 an Overpass query (`area["ISO3166-1"="HU"][admin_level=2]` → `rel[boundary=administrative][admin_level=6]`, with Overpass data timestamp 2026-10-11T11:06Z) returned **20 relations**: 19 counties and Budapest (relation 37244). Hajdú-Bihar is relation **22267** (`ISO3166-2=HU-HB`, `ref:nuts:3=HU321`).
  - The relations carry `ISO3166-2`, `ref:nuts` and `ref:nuts:3`. **No relation carries `ref:hnt`**, so the earlier SQL used a tag that doesn't exist. Use `ISO3166-2` as the stable county code.
  - The OSM `name` values use the form "… megye". The official name has been "vármegye" since 2023. That date is INFERRED from general knowledge and was not checked against the statute in this pass. Keep the display name as a separate, editable field.
- **VERIFIED.** OSM data is licensed under ODbL 1.0. The required attribution is "© OpenStreetMap contributors", plus a statement that the data is available under the ODbL, with a link to https://www.openstreetmap.org/copyright.
- **UNVERIFIED (count claim removed).** The earlier draft claimed "174 districts, 3,152 municipalities" in OSM. An Overpass count query at levels 7–9 failed with a server-busy error, so the claim is BLOCKED for now. KSH gives the official figure as **3,155 settlements** (Budapest counted once) and 19 counties plus the capital, as of 1 January 2025 (KSH Területi statisztikai évkönyv 2024, read through a search snippet, so INFERRED rather than VERIFIED).
- **Bulk access (VERIFIED):** Geofabrik publishes a Hungary extract, `hungary-latest.osm.pbf`, of about 311 MB with data up to 2026-10-08, under ODbL 1.0, and updates it close to daily. Use this extract, or a single one-off Overpass query, rather than repeatedly querying the public Overpass instance. Overpass guidance asks for no more than about 10,000 requests per day, keeps downloads under about 1 GB per day, and says that apps serving non-mappers should run their own instance (VERIFIED).

### 1.2 Lechner Tudásközpont (official state geodata)

The earlier draft pointed to KSH as the boundary source and said licensing required contacting KSH. That was imprecise. **KSH supplies codes and gazetteer data. Lechner Tudásközpont is the body that distributes the official boundary geometry.**

- **VERIFIED. Free INSPIRE dataset under CC BY 4.0.** Lechner's INSPIRE ATOM feed (`https://inspire.lechnerkozpont.hu/inspire/atom/DLS_AdministrativeUnits.xml`) links a free shapefile (`AdministrativeUnits.zip`, 5.8 MB, Last-Modified 2023-08-29) and a GML file. The dataset's ISO metadata record (id `6f267d6b-…`, titled "Administrative units (2019)") states two things:
  - "no conditions to access and use"
  - "used under the Creative Commons Attribution 4.0 International (CC BY 4.0) License". The record also gives the attribution text to use for derived data: *"Based on geospatial data provided by Lechner Knowledge Center, modified by [company + contact]. Licensed under CC BY 4.0."*
- **VERIFIED by downloading and inspecting the files outside the repo.** The shapefile holds 3,379 features in EOV (EPSG:23700): 1 country border, 7 regions, **20 county-level units** ("Vármegye", including Budapest), 175 járás units and 3,176 settlement units. Geometry `beginLifespan` = 2019-07-05; the metadata scale denominator is 5,000.
  - **Caveat (VERIFIED):** the data is stale. The county record is still named **"Csongrád"** rather than "Csongrád-Csanád", the name in use since 2020 (the renaming year is INFERRED). Expect other changes made after 2019 to be missing as well.
- **VERIFIED. A current paid product also exists.** The page `lechnerkozpont.hu/oldal/magyar-kozigazgatasi-hatarok` sells current boundaries in SHP or DXF. The price formula is A×E×count + VAT; for county or district level, A = 0.3, and E at 1 m resolution = 960 Ft per polygon. The minimum fee is 1,200 Ft + VAT, and buyers get refreshed versions within 3 years at 10% of the price. On this formula, 20 county polygons at 1 m cost about 5,760 Ft + VAT, which is INFERRED by arithmetic. **The page states no licence for the purchased data (UNVERIFIED).** Ask Lechner about redistribution rights before using the purchased data in a public web map.
- **INFERRED.** The EU High-Value Datasets regulation (EU) 2023/138 lists administrative units among its geospatial high-value datasets and requires reuse under CC BY 4.0 or less restrictive terms. **BLOCKED:** EUR-Lex returned an empty WAF challenge page to both WebFetch and curl, so this pass could not confirm the article text.

### 1.3 Recommended boundary approach (PROPOSAL)

| Option | Licence effect on our DB | Freshness | Effort | Verdict |
|---|---|---|---|---|
| **Lechner INSPIRE AU (CC BY 4.0)** | Attribution only. No share-alike, so county polygons can live in a proprietary DB. | 2019 geometry; some names stale | Low (convert EOV→WGS84 with `ogr2ogr`, fix names manually) | **Recommended for the county layer** |
| OSM `admin_level=6` (ODbL) | A publicly used derivative database, such as simplified county polygons served as GeoJSON, must be offered under ODbL. Our *other* data stays independent only if it follows the Collective Database rules (see §1.4). | Current | Low | Good fallback, or for cross-checking geometry |
| Lechner paid (current) | Licence unknown | Current | Low cost, but needs a purchase process | Ask Lechner if the INSPIRE set proves too stale |

Rationale (INFERRED): the county layer is small and changes rarely, and it is the core visual of the product. A CC BY source avoids ODbL share-alike questions for the county table. If OSM is used instead, publishing the simplified county GeoJSON under ODbL is a cheap way to comply, because the polygons have no proprietary value. Settlement points can come from either source under the same reasoning.

### 1.4 ODbL share-alike: what it means for this project

- **VERIFIED (OSMF guidelines).** Rendered maps, meaning raster or vector images, are usually *Produced Works*, and their licence can be chosen freely, provided OSM attribution is shown. A database that is "intended for the extraction of the original data" is a *Derivative Database*, and if it is publicly used it must be offered under ODbL.
- **VERIFIED (OSMF Collective Database Guideline).** OSM and non-OSM data stay independent, so share-alike does not spread to the non-OSM data, when the two sets do not reference each other, or when a feature type or property comes entirely from OSM or entirely from non-OSM data within a regional cut. **Merging a proprietary POI list with OSM POIs and de-duplicating them falls outside the guideline's safe harbour. In that case the proprietary data "may be subject to ODbL share-alike" if the combined database is publicly used.**
- **INFERRED design rule:** store OSM-derived records in separate tables or rows with a `source = 'osm'` provenance field. Never overwrite or merge OSM attributes into editor-owned records, or the reverse. Link records only in ways that fit the guideline, and record every such link. This rule shapes the ingestion design in `05-event-and-poi-ingestion.md`. **Flag for legal review** before launch, because how the guideline applies to the final schema is a legal judgement.

### 1.5 Other data sources

- **Wikidata (VERIFIED):** structured data is released under CC0. Text in other namespaces is under CC BY-SA 4.0. Images linked from Wikidata (on Wikimedia Commons) have their own licences, which this pass did not check (UNVERIFIED). Details are in `05-event-and-poi-ingestion.md`.
- **kulturinfo.hu: REMOVED as an approved source.** The earlier draft described it as an "official ministry" CC BY source with a `/sparql` endpoint. **BLOCKED / unsupported:** on 2026-10-11, HTTPS refused the connection and HTTP returned 403, and a web search found no evidence of a SPARQL endpoint, an API or a CC BY licence. Treat every earlier claim about it as fabricated until shown otherwise.

---

## 2. Base map tiles (budget about €20–50/month, total infrastructure)

### 2.1 Options verified on 2026-10-11

| Option | Cost | Commercial use | Key terms | Tag |
|---|---|---|---|---|
| **OSMF raster** `tile.openstreetmap.org` | Free | Not prohibited, but commercial services "should be especially aware that access may be withdrawn at any point" | No SLA; heavy use can be blocked without notice; no bulk or offline downloading; needs a valid Referer and User-Agent; cache for at least 7 days; visible attribution | VERIFIED |
| **OSMF vector** `vector.openstreetmap.org` (Shortbread schema) | Free | Same warning as raster | Same style of policy: no SLA, no bulk downloading, don't hard-code the URL | VERIFIED |
| **Self-hosted Protomaps PMTiles** (Hungary extract) | Server storage and traffic only | Yes | Tiles are an ODbL *Produced Work* ("© OpenStreetMap" required); code is BSD-3; styles are CC0; attributing Protomaps is requested but not required; a product built on a modified version must use a name other than "Protomaps"; daily builds are published, but hotlinking is discouraged; cut out a region with `pmtiles extract --maxzoom` | VERIFIED |
| **Self-hosted OpenMapTiles schema** (e.g. built with Planetiler, or TileServer GL) | Server only | Yes | Code is BSD-3; the schema and design are under CC BY 4.0, so maps must visibly credit **"© OpenMapTiles" and "© OpenStreetMap contributors"**; waivers of that attribution are sold by MapTiler | VERIFIED (licence); the build pipeline is UNVERIFIED |
| **MapTiler Cloud Free** | $0 | Described as "testing, PoC, prototyping, personal, or non-commercial use"; the terms (§4.3) forbid "commercial derivative works" unless licensed | 5k sessions and 100k API requests per month; service pauses at the quota; MapTiler logo required | VERIFIED: **not suitable for production** |
| **MapTiler Cloud Flex** | **$30/month** | Yes | 25k sessions and 500k requests per month; overage $2.50 per 1k sessions; a spending limit can be set | VERIFIED |
| **Stadia Maps Free** | $0 | **Not allowed** | 200k credits per month | VERIFIED: not suitable |
| **Stadia Maps Starter** | **$20/month** | Yes | 1M credits per month; 1 credit per vector or raster tile; overage 3¢ per 1k credits | VERIFIED |
| **Thunderforest** | Hobby: free, 150k requests per month; Solo Developer: **€115/month**, 1.5M | The free plan is for testing, and commercial use on it is unclear | over budget | VERIFIED (prices); commercial-use terms UNVERIFIED |
| Mapbox, Google Maps | — | — | Not re-checked in this pass. The earlier figures ("€0-500+", "$125+") were unsourced. | UNVERIFIED (removed from comparison) |

**Corrections to the earlier draft (VERIFIED):** Thunderforest is €115/month (not €125) for 1.5M requests per month (not "50k tiles/day"). The earlier "99.9%/99.99% SLA" column had no source and has been removed.

### 2.2 Recommended tile approach (PROPOSAL)

1. **MVP: self-host a Protomaps PMTiles Hungary extract** on the same EU VPS that runs the app, as a static file served over HTTP range requests through the existing reverse proxy, or through `pmtiles serve` / Caddy for Z/X/Y URLs. The added cost is close to zero (INFERRED: the extract size and VPS traffic allowance were not measured, so both are UNVERIFIED). Licensing is the simplest of the self-hosted options: ODbL Produced Work plus OSM attribution, no OpenMapTiles credit needed, and styles under CC0. Refresh roughly monthly from the published daily builds.
2. **Fallback: Stadia Starter at $20/month or MapTiler Flex at $30/month**, if self-hosting proves troublesome. Both fit the budget only if the rest of the infrastructure stays at about €20–30.
3. **Do not use the OSMF tile servers in production** (VERIFIED policy wording above). They are acceptable only for local development, with proper attribution and a configurable tile URL.

The earlier draft said "TileServer GL ~$50/month compute, €600/year". That figure had no source. It also wrongly treated self-hosting as a separate server and described a "convert MBTiles to vector tiles" step that doesn't exist. The earlier Leaflet snippet requested `.png` tiles from a vector tile server, which would only work if TileServer GL rendered raster tiles server-side. That rendering is CPU-heavy, and this pass did not verify it.

### 2.3 Leaflet vs MapLibre GL JS (PROPOSAL)

- **VERIFIED:** `protomaps-leaflet` (BSD-3) renders vector tiles inside Leaflet, but it is **in maintenance mode**. Its README says "New projects starting from scratch should probably use MapLibre GL."
- **VERIFIED:** `maplibre-gl-leaflet` (ISC) embeds MapLibre inside Leaflet, with documented limitations: no rotation or pitch, a laggier feel because Leaflet drives the MapLibre redraw, and latitude-clamp and zoom-0 workarounds.
- **INFERRED recommendation:** use **MapLibre GL JS** as the map library instead of Leaflet. It renders PMTiles and vector styles natively, supports data-driven styling of county polygons (active, inactive or disabled states) and smooth transitions into a county, and offers GeoJSON-source clustering. This changes a candidate-architecture item (Leaflet), so it **needs user approval**. If the user wants to keep Leaflet, choose between a raster provider (Stadia or MapTiler raster) and `maplibre-gl-leaflet`, accepting the limitations above. MapLibre's licence and clustering performance were **not verified** in this pass (UNVERIFIED). Check them in 02 and 03.

---

## 3. PostGIS spatial queries (illustrative, not benchmarked)

**UNVERIFIED performance.** No benchmark has been run. The earlier "30–50 ms on 100k POIs", "20–40 ms" and "10–20 ms" figures had no source and have been removed. The SQL below was corrected for syntax errors but has **not been executed**.

```sql
-- Viewport query (geometry in EPSG:4326). Avoid ORDER BY RANDOM() — it forces a full sort.
SELECT id, name, category_id, ST_AsGeoJSON(geom) AS geom
FROM pois
WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)   -- west, south, east, north
  AND ($5::int IS NULL OR category_id = $5)
ORDER BY priority DESC
LIMIT 500;

CREATE INDEX idx_pois_geom ON pois USING GIST (geom);
CREATE INDEX idx_pois_category ON pois (category_id);

-- Radius search: expression index needs double parentheses.
CREATE INDEX idx_pois_geog ON pois USING GIST ((geom::geography));
SELECT id, name FROM pois
WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 5000);

-- Point-in-county
SELECT id, name FROM counties
WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) LIMIT 1;
```

Errors removed from the earlier draft (VERIFIED from PostgreSQL syntax rules, INFERRED where marked):
- `CREATE INDEX … ON pois(category_id) INCLUDE(…) USING GIST(coordinates)` is invalid, because `USING` must come before the column list.
- `USING GIST(coordinates::geography)` needs an extra pair of parentheses around the expression.
- `ORDER BY RANDOM()` defeats the purpose of `LIMIT` (INFERRED).
- The note "PostGIS … requires legal review for GPL v2" is overstated. PostGIS runs inside a separate database server process, and proprietary application code talks to it over the network (INFERRED). See 02 for the licence analysis.

## 4. Rendering by zoom level and clustering

- **INFERRED design:** at zoom levels below about 9, show the county layer only, served from a static GeoJSON or PMTiles layer with no database query. At about 9–12, show settlements and top POIs. At about 13 and above, show all POIs and events in the viewport, with server-side limits.
- **UNVERIFIED:** the earlier claim that Leaflet.markercluster handles "50k+ markers without degradation" has no source and has been removed. If MapLibre is adopted, use GeoJSON-source clustering or server-side clustering. Benchmark either during implementation.

## 5. Attribution

Required on-map attribution, depending on the final choices (VERIFIED requirements):

| Source | Required text |
|---|---|
| OSM data or any OSM-based tiles | "© OpenStreetMap contributors", linked to https://www.openstreetmap.org/copyright |
| OpenMapTiles schema (only if used) | "© OpenMapTiles", linked to openmaptiles.org |
| Lechner boundaries | "Based on geospatial data provided by Lechner Knowledge Center, modified by [us]. Licensed under CC BY 4.0." (can go on an attribution or about page plus a short on-map credit; the right placement is INFERRED) |
| MapTiler or Stadia (if used) | Each provider's own credit (MapTiler: "© MapTiler"); Stadia's wording was not checked (UNVERIFIED) |
| Wikidata | Not required under CC0; a courtesy credit is optional |

**Corrected:** the earlier footer credited "CC-BY kulturinfo.hu". That has been removed (§1.5).

Store a per-record `source`, `source_id`, `source_url`, `licence`, `attribution_text` and `retrieved_at` (INFERRED design; the full model is in 05).

## 6. Conclusion (PROPOSAL)

- **Boundaries:** Lechner INSPIRE AU (CC BY 4.0) for counties, with names fixed manually and OSM used for cross-checking. Ask Lechner about current-data licensing.
- **Base map:** a self-hosted Protomaps PMTiles Hungary extract on the app VPS, with Stadia Starter ($20) or MapTiler Flex ($30) as the paid fallback. No OSMF tiles in production.
- **Map library:** MapLibre GL JS is proposed instead of Leaflet, pending user decision.
- **Costs:** the earlier totals ("€600–1,200/year", "$0 data") have been withdrawn as unsourced. Tile cost is INFERRED to be about €0 extra when self-hosted, or $20–30/month on a paid fallback.

---

## Verification log (2026-10-11)

**Method:** read primary sources (the OSM wiki, OSMF policy pages, provider pricing pages and terms, GitHub READMEs and licence files, and Lechner pages and metadata). Ran 2 Overpass API queries; one succeeded and one hit a server-busy error. Downloaded Lechner's public `AdministrativeUnits.zip` to a temp directory outside the repo, parsed its DBF attributes with Python, then deleted it. Nothing was scraped. All sources are in [`_sources-geo.md`](_sources-geo.md).

| # | Earlier claim | Result |
|---|---|---|
| 1 | Counties are `admin_level=4` | **Wrong.** They are `admin_level=6` (verified on the wiki and by query: 20 relations) |
| 2 | County code from `ref:hnt` | **Wrong.** The tag doesn't exist; use `ISO3166-2` or `ref:nuts:3` |
| 3 | OSM has "174 districts, 3,152 municipalities" | **Unverified.** The query was blocked; KSH says 3,155 settlements (from a snippet) |
| 4 | Official data: "contact KSH, commercial terms" | **Corrected.** Lechner publishes free CC BY 4.0 INSPIRE boundaries (2019) and sells current ones |
| 5 | kulturinfo.hu: ministry, CC-BY, SPARQL endpoint | **Unsupported, removed.** The site is unreachable and nothing confirms the claims |
| 6 | Wikidata sample: Budapest = Q1526, Q33559 | **Wrong.** Q1526 = Ramesses I and Q33559 = Ingrian; Budapest is **Q1781** (verified through the `wbgetentities` API) |
| 7 | Thunderforest €125/month, 50k tiles/day | **Wrong.** It is €115/month for 1.5M requests/month |
| 8 | Self-hosted TileServer GL at ~$50/month | **Unsourced.** Replaced by PMTiles on the existing VPS (INFERRED about €0 extra) |
| 9 | Leaflet with vector tiles | **Clarified.** Possible only through plugins with caveats; MapLibre GL JS is proposed |
| 10 | Query latency figures, markercluster 50k+ | **Unsourced, removed** |
| 11 | SQL index statements | **Syntax errors fixed** (not executed) |
| 12 | PostGIS GPL v2 needs legal review | **Downgraded to INFERRED: low risk** (separate server process) |
| 13 | ODbL "commercial use permitted" with no share-alike analysis | **Expanded.** Added the Produced Work vs Derivative Database rules and the Collective Database Guideline (VERIFIED) |

**BLOCKED:** the EUR-Lex text of Regulation 2023/138 (WAF challenge page); the Overpass count query (server busy); KSH PDFs (404 at the URL tried).
**Still UNVERIFIED:** the size of a Hungary PMTiles extract, VPS traffic allowance and price, MapLibre licence and performance, Stadia attribution wording, Mapbox and Google pricing, the licence on Lechner's paid data, and the vármegye and Csongrád-Csanád renaming dates.
