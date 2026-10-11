# Sources for 01, 02, and 07 (licensing verification pass, 2026-10-11; to be merged into 10-source-register.md)

The inspected clones are shallow (`--depth 1`) and live in `%TEMP%\momap-audit\` outside the repository. No third-party code was copied into the repository.

| URL | Claim supported | Access date | Source type |
|-----|-----------------|-------------|-------------|
| https://github.com/liketrek/TREK/blob/1c05ee4b3ac9523c41ccdd3baad989ba48a7409a/LICENSE | TREK is AGPL-3.0 (full text) at HEAD `1c05ee4b`, commit date 2026-09-26 | 2026-10-11 | License file (cloned) |
| https://github.com/liketrek/TREK/blob/1c05ee4b3ac9523c41ccdd3baad989ba48a7409a/TRADEMARKS.md | The "TREK" name is trademark-restricted separately from the AGPL | 2026-10-11 | Repo file (cloned) |
| https://github.com/liketrek/TREK/blob/1c05ee4b3ac9523c41ccdd3baad989ba48a7409a/NOTICE.md | TREK bundles geoBoundaries (CC BY 4.0) and uses OSM, Nominatim, Overpass, and Wikimedia data | 2026-10-11 | Repo file (cloned) |
| https://github.com/liketrek/TREK/blob/1c05ee4b3ac9523c41ccdd3baad989ba48a7409a/server/package.json | NestJS 11, Express 4, better-sqlite3 | 2026-10-11 | Manifest (cloned) |
| https://github.com/liketrek/TREK/blob/1c05ee4b3ac9523c41ccdd3baad989ba48a7409a/client/package.json | React 19, Leaflet ^1.9.4, maplibre-gl 5.24.0, mapbox-gl ^3.22.0 | 2026-10-11 | Manifest (cloned) |
| https://api.github.com/repos/liketrek/TREK | Not a fork, not archived. SPDX AGPL-3.0, created 2026-03-19, pushed 2026-10-11T00:42Z, 14,702 stars | 2026-10-11 | GitHub API |
| https://api.github.com/repos/liketrek/TREK/releases/latest | Latest release v4.3.3, published 2026-09-26 | 2026-10-11 | GitHub API |
| https://registry.npmjs.org/mapbox-gl/latest | mapbox-gl 3.32.0 license field "SEE LICENSE IN LICENSE.txt" (not an OSI license) | 2026-10-11 | npm registry |
| https://github.com/itskovacs/TRIP/blob/856b1edfe81a735fce4b544c2e16a6518cebf164/license.txt | TRIP is MIT, "Copyright (c) 2026 Kovacs", at HEAD `856b1edf` (2026-10-02) | 2026-10-11 | License file (cloned) |
| https://github.com/itskovacs/TRIP/blob/856b1edfe81a735fce4b544c2e16a6518cebf164/src/package.json | Angular ^21.1.1, PrimeNG ^21.0.4, Leaflet ^1.9.4, leaflet.markercluster ^1.5.3, Transloco | 2026-10-11 | Manifest (cloned) |
| https://github.com/itskovacs/TRIP/blob/856b1edfe81a735fce4b544c2e16a6518cebf164/backend/trip/requirements.txt | FastAPI ~0.141, SQLModel ~0.0.47 | 2026-10-11 | Manifest (cloned) |
| https://api.github.com/repos/itskovacs/TRIP | Canonical name `itskovacs/trip`, not a fork, MIT, 1,949 stars, pushed 2026-10-02 | 2026-10-11 | GitHub API |
| https://framagit.org/kaihuri/mobilizon/-/blob/f2590486f6ee056f01fa05412a16f9a08c65357e/LICENSE | Mobilizon is AGPL-3.0 at HEAD `f2590486` (2026-09-30) | 2026-10-11 | License file (cloned) |
| https://framagit.org/kaihuri/mobilizon/-/blob/f2590486f6ee056f01fa05412a16f9a08c65357e/mix.exs | Elixir ~> 1.17, Phoenix ~> 1.8, LiveView ~> 1.0, geo_postgis ~> 3.1 | 2026-10-11 | Manifest (cloned) |
| https://framagit.org/api/v4/projects/kaihuri%2Fmobilizon | Project id 20125, created 2017-12-08 (the original project, now under the `kaihuri` namespace), not a fork, last activity 2026-10-11 | 2026-10-11 | GitLab API |
| https://framagit.org/api/v4/projects/20125/releases | Latest stable 5.2.4 (2026-07-01 CEST), 5.2.5-RC.1 (2026-10-01 CEST) | 2026-10-11 | GitLab API |
| https://framagit.org/framasoft/mobilizon | Old URL returns 302 to the sign-in page, so the redirect to `kaihuri` could not be confirmed anonymously | 2026-10-11 | HTTP check |
| https://github.com/robertoranon/tokoro/blob/2e3b8eb732eb59cdacc725bc63030d689627c4ed/LICENSE | Tokoro is MPL-2.0 at HEAD `2e3b8eb7` (2026-10-07). crawler/crawler-worker package.json also say MPL-2.0 | 2026-10-11 | License file (cloned) |
| https://github.com/robertoranon/tokoro/blob/2e3b8eb732eb59cdacc725bc63030d689627c4ed/worker/wrangler.toml.example | Cloudflare Workers with D1 and R2 bindings | 2026-10-11 | Config (cloned) |
| https://github.com/robertoranon/tokoro/blob/2e3b8eb732eb59cdacc725bc63030d689627c4ed/crawler/package.json | Crawler depends on @anthropic-ai/sdk and openai | 2026-10-11 | Manifest (cloned) |
| https://api.github.com/repos/robertoranon/tokoro | Not a fork. GitHub SPDX NOASSERTION (file is MPL-2.0 text). 7 stars, created 2026-04-10, pushed 2026-10-07, no tags | 2026-10-11 | GitHub API |
| https://github.com/strapi/strapi/blob/v5.57.0/LICENSE | Dual license: `ee/` dirs under the Enterprise license, else MIT Expat "if ... you have no registered account on our cloud offering". Identical to HEAD `5ca3fb20` | 2026-10-11 | License file (tag, diffed with clone) |
| https://github.com/strapi/strapi/blob/5ca3fb208a882258c07f10d590a934db718ba8fb/packages/core/review-workflows/LICENSE | The whole `@strapi/review-workflows` package is under the Enterprise License | 2026-10-11 | License file (cloned) |
| https://github.com/strapi/strapi/blob/5ca3fb208a882258c07f10d590a934db718ba8fb/packages/core/content-releases/LICENSE | The whole `@strapi/content-releases` package is under the Enterprise License | 2026-10-11 | License file (cloned) |
| https://github.com/strapi/strapi/blob/5ca3fb208a882258c07f10d590a934db718ba8fb/packages/core/strapi/package.json | `@strapi/strapi` 5.57.0 depends on @strapi/review-workflows and @strapi/content-releases (EE-licensed packages ship in a default install) | 2026-10-11 | Manifest (cloned) |
| https://github.com/strapi/strapi/tree/5ca3fb208a882258c07f10d590a934db718ba8fb/packages/core/admin/ee/server/src | Audit logs, SSO (passport), and seat enforcement live under `ee/` | 2026-10-11 | Source tree (cloned) |
| https://github.com/strapi/strapi/blob/5ca3fb208a882258c07f10d590a934db718ba8fb/packages/plugins/i18n/LICENSE | The i18n package is MIT outside `ee/` dirs, and it has no `ee/` dir | 2026-10-11 | License file (cloned) |
| https://github.com/strapi/strapi/blob/5ca3fb208a882258c07f10d590a934db718ba8fb/packages/core/database/src/dialects/postgresql/schema-inspector.ts | The only PostGIS reference is excluding `geometry_columns`. No native geometry attribute type was found | 2026-10-11 | Source (cloned) |
| https://registry.npmjs.org/@strapi/strapi/latest | 5.57.0, license "SEE LICENSE IN LICENSE", node >=20 <=26 | 2026-10-11 | npm registry |
| https://strapi.io/pricing-self-hosted | Community free, unlimited seats. Growth $45/mo (Releases, 14-day content history). Review Workflows, Audit Logs, and SSO are Enterprise (SSO is a Growth add-on) | 2026-10-11 | Vendor pricing page |
| https://docs.strapi.io/cms/deployment | Min 1 core / 2 GB RAM / 8 GB disk, recommended 2+ cores / 4 GB+. PostgreSQL 14 min, 17 recommended. Node active/maintenance LTS | 2026-10-11 | Official docs |
| https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/i18n-content-manager-locale | i18n is part of Strapi 5 core | 2026-10-11 | Official docs |
| https://docs.strapi.io/cms/features/internationalization | i18n is a Free feature. AI translation is paid (Growth) | 2026-10-11 | Official docs (via search summary) |
| https://github.com/directus/directus/blob/v12.5.0/license | MSCL-1.0-GPL: any purpose except "Competing Use". Do not circumvent license keys. Each version becomes GPL-3.0 after 4 years. Identical to HEAD `8e140f94` | 2026-10-11 | License file (tag, diffed with clone) |
| https://github.com/directus/directus/blob/v11.17.4/license | Last v11 was BSL 1.1 with a $5M "Total Finances" Additional Use Grant (revenue, budget, or funding, incl. affiliates). Change Date 3 years, GPLv3 | 2026-10-11 | License file (tag) |
| https://github.com/directus/directus/blob/8e140f94250834cea0a0fb6eb822cac39ed9faec/api/src/license/entitlements/manager.ts | Entitlements enforced in code: collections, seats, flows (counters). SSO, custom LLMs, and custom permission rules (gates) | 2026-10-11 | Source (cloned) |
| https://github.com/directus/directus/tree/8e140f94250834cea0a0fb6eb822cac39ed9faec/api/src/database/helpers/geometry | Native geometry helpers per dialect. The postgres dialect detects `postgis_version` | 2026-10-11 | Source (cloned) |
| https://github.com/directus/directus/blob/8e140f94250834cea0a0fb6eb822cac39ed9faec/api/src/services/activity.ts | Activity (`directus_activity`) and revisions (`directus_revisions`) services are not in the entitlement list | 2026-10-11 | Source (cloned) |
| https://registry.npmjs.org/@directus/api/latest | @directus/api 40.0.0, "SEE LICENSE IN license", node >=22. @directus/sdk 27.0.0 MIT. @directus/license 0.6.1 MIT | 2026-10-11 | npm registry |
| https://directus.com/resources/directus-v12-license-change | v12 (May 2026) moved from BSL to MSCL (derived from FCL). Innovation Grant: under $5M revenue and 50 employees. Above that, Core tier is free within limits. Keys for paid and grant users. Core needs no registration | 2026-10-11 | Vendor blog |
| https://directus.com/pricing | Core $0: 3 seats, 25 collections, 5 flows, no SSO. Team $499/mo. Self-hosting on every tier. Grant: "<$5M annual revenue and <50 employees" | 2026-10-11 | Vendor pricing page |
| https://directus.com/docs/licensing/open-innovation-grant | Grant key: 5 activations bound to PUBLIC_URL, valid 1 year, renewable, 30-day grace, falls back to Core on expiry. Eligibility is assessed by "legal entities whose representatives log into the Directus Studio" | 2026-10-11 | Official docs |
| https://directus.com/mscl | MSCL text. No dollar threshold in the license itself | 2026-10-11 | Vendor license page |
| https://directus.com/docs/self-hosting/requirements | Min 0.25 vCPU / 512 MB container, recommended 1 vCPU / 2 GB. Redis optional for a single instance | 2026-10-11 | Official docs |
| https://docs.directus.io/packages/@directus/constants/variables/geometry_types | Geometry types Point, LineString, Polygon, and Multi variants | 2026-10-11 | Official API docs (via search) |
| https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE | BSD-2-Clause. Tag v1.9.4 = `d15112c9`, 2023-05-18 | 2026-10-11 | License file (tag) |
| https://github.com/Leaflet/Leaflet/blob/125bda1e24d74d6f06f4075b0dab7ac10f3b5c10/package.json | main = 2.0.0-alpha.1, no runtime dependencies | 2026-10-11 | Manifest (cloned) |
| https://registry.npmjs.org/leaflet | dist-tags: latest 1.9.4, alpha 2.0.0-alpha.1. leaflet.markercluster 1.5.3 MIT. maplibre-gl BSD-3-Clause | 2026-10-11 | npm registry |
| https://github.com/postgis/postgis/blob/9e97dbf69ea7f8507acc2e11b326770e31dc8a82/LICENSE.TXT | GPL v2 "or (at your option) any later version". Deps PROJ (MIT), GEOS (LGPL), GDAL (MIT-style), SFCGAL (GPLv2+). Docs CC BY-SA 3.0 | 2026-10-11 | License file (cloned) |
| https://github.com/postgis/postgis/blob/9e97dbf69ea7f8507acc2e11b326770e31dc8a82/Version.config | main = 3.7.0dev | 2026-10-11 | Repo file (cloned) |
| https://api.github.com/repos/postgis/postgis/commits/3.6.4 | 3.6.4 = `94d984bd`, 2026-06-08. 3.7.0rc2 = `e2ea03ad`, 2026-09-08. 3.6.0 = 2025-09-01 | 2026-10-11 | GitHub API |
| https://postgis.net/documentation/faq/gpl-license/ | PostGIS FAQ: GPL share-alike does not apply to ordinary use (loading data, running queries). Apps may use any license. Only distributing modified PostGIS triggers source obligations | 2026-10-11 | Official project FAQ |
| https://www.gnu.org/licenses/gpl-faq.en.html#MereAggregation | Sockets/pipes are normally separate programs. Same executable or shared address space means one program. The line is ultimately a legal question | 2026-10-11 | FSF FAQ |
| https://www.gnu.org/licenses/gpl-faq.en.html#UnreleasedMods | Running (even modified) GPL software on a web site without distributing it requires no source release. AGPL differs | 2026-10-11 | FSF FAQ |
| https://www.gnu.org/licenses/gpl-faq.en.html#GPLInProprietarySystem | GPL software may be distributed alongside proprietary software if they communicate "at arms length" | 2026-10-11 | FSF FAQ |
