# Sources: geospatial data, tiles, and event/POI ingestion (docs 04 and 05)

All sources were accessed on 2026-10-11. Types: official doc, repo file, terms, robots.txt, API response, dataset, secondary source.

| URL | Claim | Access date | Type |
|---|---|---|---|
| https://wiki.openstreetmap.org/wiki/Tag:boundary=administrative | In the Hungary row, admin_level 6 is "Megyék / főváros" (NUTS 3), 4 is NUTS 1, 5 is NUTS 2, 7 is járások, 8 is települések, and 9 is kerületek | 2026-10-11 | official doc (OSM wiki) |
| https://overpass-api.de/api/interpreter (query: HU area, `rel[boundary=administrative][admin_level=6]`, `out tags`) | Returns 20 relations (19 counties plus Budapest 37244); Hajdú-Bihar is 22267 with `HU-HB` and `ref:nuts:3=HU321`; no relation has a `ref:hnt` tag | 2026-10-11 | API response (executed query) |
| https://www.openstreetmap.org/copyright | OSM data is under ODbL; attribution "© OpenStreetMap contributors"; share-alike applies to altered data | 2026-10-11 | official doc |
| https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline | Rendered images and maps are usually Produced Works; a database intended for extraction is a Derivative Database | 2026-10-11 | official doc (OSMF guideline) |
| https://osmfoundation.org/wiki/Licence/Community_Guidelines/Collective_Database_Guideline_Guideline | Independence rules for OSM and non-OSM data; merging and de-duplicating proprietary data with OSM data is not covered and may trigger share-alike | 2026-10-11 | official doc (OSMF guideline) |
| https://operations.osmfoundation.org/policies/tiles/ | No SLA; access for commercial users "may be withdrawn at any point"; no bulk or offline use; User-Agent, Referer, 7-day cache, and attribution rules | 2026-10-11 | official doc (policy) |
| https://operations.osmfoundation.org/policies/vector/ | The OSMF vector tile service has the same restrictions, no SLA, and a commercial-use warning | 2026-10-11 | official doc (policy) |
| https://dev.overpass-api.de/overpass-doc/en/preface/commons.html | Public Overpass guideline is about 10,000 requests per day and under about 1 GB per day; apps for non-mappers should run their own instance | 2026-10-11 | official doc |
| https://overpass-api.de/robots.txt | `/api/` is disallowed for crawlers | 2026-10-11 | robots.txt |
| https://www.openstreetmap.org/robots.txt | Bulk users are pointed to planet files and extracts; scraping leads to blocking | 2026-10-11 | robots.txt |
| https://download.geofabrik.de/europe/hungary.html | `hungary-latest.osm.pbf` is 311 MB, contains data to 2026-10-08, and is licensed ODbL 1.0 | 2026-10-11 | dataset page |
| https://inspire.lechnerkozpont.hu/inspire/atom/DLS_AdministrativeUnits.xml | Lechner INSPIRE administrative-units download feed exists; rights "public" | 2026-10-11 | dataset feed |
| https://inspire.lechnerkozpont.hu/inspire/atom/DS_AdministrativeUnits.xml | Links to the SHP and GML downloads; CRS is EPSG:23700 | 2026-10-11 | dataset feed |
| https://inspire.lechnerkozpont.hu/geonetwork/srv/eng/csw?service=CSW&request=GetRecordById&version=2.0.2&outputSchema=http://www.isotc211.org/2005/gmd&elementSetName=full&id=6f267d6b-3ea2-44ad-9eae-04bd55836a2e | Metadata states "no conditions to access and use" and CC BY 4.0, gives the attribution template, scale 1:5,000, and title "Administrative units (2019)" | 2026-10-11 | official metadata |
| https://inspire.lechnerkozpont.hu/inspire/atom/data/AdministrativeUnits.zip | Downloaded and inspected outside the repo: 3,379 features (20 county-level, 175 járás, 3,176 settlement); beginLifespan 2019-07-05; still uses the name "Csongrád"; Last-Modified 2023-08-29 | 2026-10-11 | dataset (inspected) |
| https://inspire.lechnerkozpont.hu/geoserver/AU/ows?service=wfs&version=2.0.0&request=GetCapabilities | WFS Fees and AccessConstraints are "NONE" | 2026-10-11 | API response |
| https://lechnerkozpont.hu/oldal/magyar-kozigazgatasi-hatarok | Paid current boundaries in SHP or DXF; price formula A×E×count + VAT; no licence text on the page | 2026-10-11 | official doc |
| https://lists.openstreetmap.org/pipermail/talk-hu/2022-July/017087.html | Community opinion that the INSPIRE boundaries appear freely usable but simplified (context only) | 2026-10-11 | secondary source |
| https://www.ksh.hu/evkonyvek/2024/teruleti-statisztikai-evkonyv-2024/pdf/terstat_2024_bevezetes.pdf | As of 1 January 2025: 19 counties plus the capital and 3,155 settlements (read only through a search snippet, so INFERRED) | 2026-10-11 | official doc (via search snippet) |
| https://www.ksh.hu/hvd_eng | KSH publishes statistical high-value datasets through APIs; no licence named on the page; no boundary data | 2026-10-11 | official doc |
| https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023R0138 | High-Value Datasets regulation: BLOCKED (WAF challenge returned an empty page) | 2026-10-11 | official doc (BLOCKED) |
| https://www.maptiler.com/cloud/pricing/ | Free plan $0 (5k sessions, 100k requests, described as for "non-commercial use"); Flex $30/month (25k sessions, 500k requests) with overage rates | 2026-10-11 | pricing page |
| https://www.maptiler.com/terms/ | §4.3 bars commercial derivative works unless licensed; §6.1 requires "© MapTiler" credit and the logo on free accounts | 2026-10-11 | terms |
| https://stadiamaps.com/pricing/ | Free plan has 200k credits and does not allow commercial use; Starter $20 (1M credits); 1 credit per tile; overage 3¢ per 1k credits | 2026-10-11 | pricing page |
| https://www.thunderforest.com/pricing/ | Hobby plan free (150k requests); Solo Developer €115/month (1.5M); Small Business €235/month | 2026-10-11 | pricing page |
| https://docs.protomaps.com/basemaps/downloads | Daily builds; `pmtiles extract`; basemap is an ODbL Produced Work requiring OSM attribution; hotlinking discouraged | 2026-10-11 | official doc |
| https://docs.protomaps.com/deploy/ | Deployment options: static file, Caddy, `pmtiles serve`, Cloudflare, AWS | 2026-10-11 | official doc |
| https://github.com/protomaps/basemaps | Code BSD-3; styles CC0; tiles ODbL Produced Work; naming restriction for modified products | 2026-10-11 | repo file (README) |
| https://openmaptiles.org/about/ | Project is "BSD + CC-BY"; can be self-hosted | 2026-10-11 | official doc |
| https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md | Code BSD-3; schema and design CC BY 4.0; credits "© OpenMapTiles" and "© OpenStreetMap contributors" required; MapTiler grants waivers | 2026-10-11 | repo file (licence) |
| https://github.com/protomaps/protomaps-leaflet | BSD-3; in maintenance mode; "New projects … should probably use MapLibre GL" | 2026-10-11 | repo file (README) |
| https://github.com/maplibre/maplibre-gl-leaflet | ISC licence; no rotation or pitch; laggy sync; workarounds needed | 2026-10-11 | repo file (README) |
| https://www.wikidata.org/wiki/Wikidata:Licensing | Structured data is CC0; text in other namespaces is CC BY-SA 4.0 | 2026-10-11 | official doc |
| https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual | 60 s timeout; 60 s processing per 60 s per client; 5 parallel queries per IP; User-Agent policy; dumps for bulk use | 2026-10-11 | official doc |
| https://query.wikidata.org/robots.txt | `/sparql` is disallowed for crawlers | 2026-10-11 | robots.txt |
| https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q33506\|Q1526\|Q33559\|Q28\|Q1781\|Q79880 | Q1526 is Ramesses I, Q33559 is Ingrian, Q1781 is Budapest, Q79880 is Debrecen, Q28 is Hungary, Q33506 is museum | 2026-10-11 | API response |
| https://www.debrecen.hu/ | Municipal portal; links the events page and the impresszum | 2026-10-11 | official site |
| https://www.debrecen.hu/hu/turista/impresszum/ | Operator is Debrecen MJV Önkormányzata; content may be reused only with a source reference; electronic storage or processing is prohibited without written consent | 2026-10-11 | terms (impresszum) |
| https://www.debrecen.hu/robots.txt | Returns 404 (no robots.txt) | 2026-10-11 | robots.txt |
| https://www.debrecen.hu/hu/turista/esemenyek-a-heten/ | 302 redirect to debreceniprogramok.com/hu | 2026-10-11 | official site (redirect) |
| https://debreceniprogramok.com/hu | "© 2026 Debreceni Programok. Minden jog fenntartva"; no API or feed; operator not named | 2026-10-11 | site / terms |
| https://debreceniprogramok.com/robots.txt | Disallows `/ajax/` only | 2026-10-11 | robots.txt |
| https://visitdebrecen.com/ | Tourinform Debrecen site; "© 2026 visitdebrecen"; no feed or API found; no reuse terms | 2026-10-11 | official site |
| https://visitdebrecen.com/company-information/ | Contact debrecen@tourinform.hu, Piac u. 20; legal entity not named | 2026-10-11 | official site |
| https://visitdebrecen.com/robots.txt | Disallows `/wp-admin/` only | 2026-10-11 | robots.txt |
| https://hajduszoboszlo.hu/ | Events calendar; no feed or API; impresszum link | 2026-10-11 | official site |
| https://hajduszoboszlo.hu/felhasznalas-es-adatvedelem/ | Operator is Hajdúszoboszlói Turisztikai Közhasznú Nonprofit Kft.; no reuse terms | 2026-10-11 | terms / privacy |
| https://www.hajduszoboszlo.hu/robots.txt | Disallows `/wp-admin/` only | 2026-10-11 | robots.txt |
| https://visithungary.com/ | Events calendar `/collection/events`; B2B section; no API documentation | 2026-10-11 | official site |
| https://visithungary.com/impressum | Operator is Visit Hungary National Tourism Organisation Ltd.; no reuse terms found | 2026-10-11 | terms (impressum) |
| https://visithungary.com/robots.txt | `Disallow: /publicapi/` | 2026-10-11 | robots.txt |
| https://kozadatportal.hu/ | Nemzeti Közadatportál, set up under Act CI of 2023; dataset catalogue | 2026-10-11 | official site |
| https://kozadatportal.hu/disclaimers | Content is NAVÜ Kft. IP by default; licence set per dataset; commercial reuse allowed within each dataset's licence | 2026-10-11 | terms |
| https://kozadatportal.hu/dataset/?q=Debrecen | One result: KSH "Debrecen időjárási adatai", licensed CC Non-Commercial | 2026-10-11 | dataset search |
| https://kozadatportal.hu/dataset/?q=turizmus | Two KSH statistical tourism datasets; no event or POI data | 2026-10-11 | dataset search |
| https://kozadatportal.hu/robots.txt | `Disallow: /api/`; Crawl-Delay 10 | 2026-10-11 | robots.txt |
| https://opendata.hu/ | K-Monitor-run CKAN catalogue; no Debrecen or tourism data seen | 2026-10-11 | site |
| https://kozadat.hu/kereso/ | NISZ public-data search (Közadatkereső); no API or licence stated | 2026-10-11 | site |
| https://data.gov.hu/ | BLOCKED: DNS resolves but connections on 80 and 443 are refused | 2026-10-11 | site (BLOCKED) |
| https://kulturinfo.hu/ | BLOCKED: HTTPS connection refused, HTTP 403; no evidence of a SPARQL endpoint or CC BY licence | 2026-10-11 | site (BLOCKED) |
| https://mobilizon.hu/ | Domain does not exist (NXDOMAIN) | 2026-10-11 | DNS check |
| https://budapestinfo.hu/robots.txt | `Disallow:` (everything allowed); the site is client-rendered, so terms are BLOCKED | 2026-10-11 | robots.txt |
| https://budapest.hu/robots.txt | Allows `/`, with one civil-database path disallowed | 2026-10-11 | robots.txt |
| https://port.hu/robots.txt | Blocks the ticket paths and AI crawlers (anthropic-ai, GPTBot, CCBot, and others) | 2026-10-11 | robots.txt |
| https://www.hnp.hu/robots.txt | No robots.txt (serves an HTML page instead) | 2026-10-11 | robots.txt |
