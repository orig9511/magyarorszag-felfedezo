# Repository Audit Report

**Status:** Audit draft, revised 2026-10-11 by a verification pass. Nothing here is an approved decision unless it is marked **APPROVED** (user decision, 2026-10-11).
**Evidence tags:** **VERIFIED** (checked directly in a license file, manifest, source, API, or official doc), **INFERRED** (reasoned from evidence), **UNVERIFIED** (not adequately checked), **BLOCKED** (could not be checked).
**Sources:** see `_sources-licensing.md`. Revisions inspected are listed in the verification log at the end of this file.

## Overview

This file assesses the 9 candidates from CLAUDE.md §5 (Mobilizon's docs site counts with Mobilizon, which leaves 8 repositories). The approved MVP decisions (2026-10-11) shape every conclusion here:

- **APPROVED:** TREK, TRIP, Mobilizon, and Tokoro are **reference-only**. That means no code copying and no running them as services. The only real third-party runtime dependencies are **Leaflet, PostGIS, and one CMS**.
- **APPROVED:** Platform code is **proprietary / closed-source**.
- **APPROVED:** **Solo developer** (user plus AI agents) with a **EUR 20–50/month EU VPS** budget.

So for the four reference projects, license risk now matters only if someone copies code by mistake. Because the policy is to study ideas, not code, their licenses no longer block anything. **INFERRED.**

> Correction from the previous draft: it stated "All findings verified" with "no access failures". That was not supported. Several claims (stars, commit counts, feature lists) were unsourced, and some were wrong. See the verification log.

---

## 1. TREK (collaborative travel planner): reference only

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/liketrek/TREK. Not a fork, not archived, created 2026-03-19 | VERIFIED (GitHub API) |
| License | **AGPL-3.0**, full text in `LICENSE` at `1c05ee4b` | VERIFIED |
| Trademark | `TRADEMARKS.md` restricts use of the "TREK" name separately from the AGPL | VERIFIED |
| Latest release | v4.3.3, 2026-09-26 | VERIFIED |
| Last activity | Default-branch HEAD commit 2026-09-26. Repo `pushed_at` 2026-10-11T00:42Z (may be another branch) | VERIFIED |
| Popularity | 14,702 stars | VERIFIED (API, 2026-10-11) |
| Stack | Server: NestJS 11, Express 4, better-sqlite3 (`server/package.json`). Client: React 19, Leaflet ^1.9.4, maplibre-gl, **mapbox-gl ^3** (`client/package.json`) | VERIFIED |
| Bundled data | geoBoundaries admin boundaries (CC BY 4.0), OSM/Nominatim/Overpass, Wikimedia Commons (`NOTICE.md`) | VERIFIED |
| Features (real-time sync, budgeting, offline, plugins) | Listed in the earlier draft, not checked in this pass | UNVERIFIED |

**Notes:**
- `mapbox-gl` v2+ is not OSI-licensed: npm shows "SEE LICENSE IN LICENSE.txt" (**VERIFIED**). That is one more reason not to copy TREK's map layer. **INFERRED.**
- `NOTICE.md` is a good model for how to present data attribution (geoBoundaries, OSM, Commons author/licence display). Study the *practice*, not the files. **INFERRED.**

**Recommendation:** Reference only (**APPROVED** policy). Study its UX and its attribution practice. Do not copy code, assets, or bundled GeoJSON.

---

## 2. TRIP (minimalist POI map tracker): reference only

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/itskovacs/TRIP. Canonical name `itskovacs/trip` (case only). Not a fork | VERIFIED |
| License | **MIT**, `license.txt`, "Copyright (c) 2026 Kovacs", at `856b1edf` | VERIFIED |
| Latest release / activity | 1.50.1, 2026-10-02. HEAD commit 2026-10-02 | VERIFIED |
| Popularity | 1,949 stars | VERIFIED (API) |
| Frontend | Angular ^21.1.1, PrimeNG ^21.0.4, Leaflet ^1.9.4, leaflet.markercluster ^1.5.3, Transloco (i18n) | VERIFIED (`src/package.json`) |
| Backend | FastAPI ~0.141, SQLModel ~0.0.47, Alembic, SQLite | VERIFIED (`backend/trip/requirements.txt`, `alembic.ini`) |
| Fork count (119) | Not rechecked | UNVERIFIED |

**Notes:** TRIP is the closest stack match for the *frontend* (Angular + Leaflet + markercluster + Transloco), so it is the most useful reference for structure. MIT would technically allow reuse with a notice, but the **APPROVED** policy is reference-only, so nothing is copied. **INFERRED.**

**Recommendation:** Reference only. Study the Angular–Leaflet integration and the marker-clustering setup.

---

## 3. Mobilizon (federated events): reference only

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://framagit.org/kaihuri/mobilizon. GitLab project id 20125, created 2017-12-08, not a fork. That is the original Framasoft project, now under the `kaihuri` namespace | VERIFIED (GitLab API) |
| Old URL | `framagit.org/framasoft/mobilizon` returns 302 to sign-in for anonymous requests, so the redirect cannot be confirmed | BLOCKED |
| Git redirect | `git clone` reported `redirecting to .../kaihuri/mobilizon.git/` (only adds the `.git` suffix) | VERIFIED |
| License | **AGPL-3.0**, `LICENSE` at `f2590486` | VERIFIED |
| Latest release | **5.2.4 (2026-07-01)**. 5.2.5-RC.1 (2026-10-01). Last activity 2026-10-11 | VERIFIED |
| Stack | Elixir ~> 1.17, Phoenix ~> 1.8, LiveView, `geo_postgis` (PostgreSQL+PostGIS), Vue ^3.5.39 | VERIFIED (`mix.exs`, `package.json`) |
| Docs site | https://docs.mobilizon.org/, not opened in this pass | UNVERIFIED |
| GDPR-by-design / moderation features | Not checked | UNVERIFIED |

> Correction: the previous draft gave "v4.1.0 (February 29, 2024)" as the latest release. That is stale. The latest stable release is 5.2.4. The "6,986 commits / 92 releases" figures were not reproduced, so they have been removed.

**Recommendation:** Reference only. The event data model (statuses, participation, moderation reports) is worth studying. Running it as a service is excluded by the **APPROVED** policy, so the earlier "API integration if legal team accepts AGPL" path is withdrawn.

---

## 4. Tokoro (event extraction / aggregation): reference only

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/robertoranon/tokoro. Not a fork, created 2026-04-10 | VERIFIED |
| License | **MPL-2.0**, `LICENSE` at `2e3b8eb7`. `crawler/` and `crawler-worker/` package.json also say MPL-2.0. GitHub shows SPDX "NOASSERTION", which is a detection quirk | VERIFIED |
| Activity | HEAD commit 2026-10-07. 7 stars. No git tags | VERIFIED |
| Stack | Cloudflare Workers with D1 (SQLite) and R2 (`worker/wrangler.toml.example`). `ngeohash` for spatial keys. LLM extraction via `openai` and `@anthropic-ai/sdk`. Jina Reader fetcher | VERIFIED (manifests and source) |
| "335+ commits" | Not reproduced (shallow clone) | UNVERIFIED |

**Notes:** MPL-2.0 is file-level copyleft, so copying a file would carry MPL obligations for that file. Under the reference-only policy, nothing is copied. The earlier draft suggested reusing "Tokoro's prompts", which has been withdrawn: prompts in MPL files are covered too. Write your own. **INFERRED.**
Tokoro's crawler uses a third-party reader service (`r.jina.ai`). Any similar approach in this project needs its own terms and source review (see `05`). **INFERRED.**

**Recommendation:** Reference only. Study the pipeline shape (discover, fetch, extract, dedupe, geocode).

---

## 5. Strapi (headless CMS): CMS candidate

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/strapi/strapi. Not a fork | VERIFIED |
| Latest release | v5.57.0 (tag `ca3974da`, 2026-10-07). HEAD `5ca3fb20` 2026-10-09 | VERIFIED |
| Popularity | 73,293 stars | VERIFIED (API) |
| License | **Not plain MIT.** Root `LICENSE`: code under `ee/` dirs is Enterprise; everything else is MIT "if ... you have no registered account on our cloud offering" | VERIFIED |
| EE packages | `packages/core/review-workflows` and `packages/core/content-releases` are **entirely Enterprise-licensed**, and `@strapi/strapi` 5.57.0 depends on both. Audit logs and SSO live in `packages/core/admin/ee/` | VERIFIED |
| Runtime | Node >=20 <=26 (npm). Docs: active/maintenance LTS (22/24/26). PostgreSQL 14+ | VERIFIED |
| Hardware | Min 1 core / 2 GB RAM, recommended 2 cores / 4 GB | VERIFIED (docs) |
| i18n | In Strapi 5 core, free tier | VERIFIED (docs and `packages/plugins/i18n/LICENSE` MIT) |
| Geo fields | No native geometry type found in `@strapi/database` | VERIFIED (absence in inspected module only, so a plugin may exist; not exhaustive) |
| Paid-tier features | Releases (Growth $45/mo). Review Workflows, Audit Logs (Enterprise). SSO (Enterprise / Growth add-on) | VERIFIED (pricing page) |

> Correction: the earlier draft listed "review workflows, releases scheduling" as MIT Community features and called Strapi "100% MIT". Both are wrong. Details in `02` §5 and `07`.

**Recommendation:** Still a viable CMS. See `07` for the comparison and the proposal.

---

## 6. Directus (data platform / CMS): CMS candidate

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/directus/directus. Not a fork | VERIFIED |
| Latest release | v12.5.0 (tag `4f77933b`, 2026-10-07). HEAD `8e140f94` 2026-10-09 | VERIFIED |
| Popularity | 38,397 stars | VERIFIED (API) |
| License (v12+) | **Monospace Sustainable Core License 1.0 (MSCL-1.0-GPL)**: source-available, any purpose except "Competing Use", no tampering with license keys, each version becomes GPL-3.0 after 4 years | VERIFIED (`license` at v12.5.0) |
| Revenue threshold | **Not in the license text.** It lives in the separate **Open Innovation Grant**: free full access for entities under $5M annual revenue *and* under 50 employees. Above that, the free **Core** tier is capped at 3 seats, 25 collections, and 5 flows | VERIFIED (pricing, grant docs) |
| Prior license | ≤ v11 used BSL 1.1 with a $5M "Total Finances" grant (revenue, budget, or funding, incl. affiliates) | VERIFIED (`license` at v11.17.4) |
| Enforcement | v12 code enforces entitlements: collections, seats, flows, SSO, custom LLMs, custom permission rules | VERIFIED (`api/src/license/entitlements/manager.ts`) |
| Runtime | `@directus/api` 40.0.0, node >=22. Distributed as a Docker image | VERIFIED |
| Hardware | Min 0.25 vCPU / 512 MB, recommended 1 vCPU / 2 GB. Redis optional for a single instance | VERIFIED (docs) |
| Geo fields | Native geometry types (Point…MultiPolygon). The postgres dialect detects PostGIS | VERIFIED (source and API docs) |
| Activity / revisions | `directus_activity` and `directus_revisions` services, not entitlement-gated | VERIFIED (source) |

> Correction: the earlier draft said the MSCL itself contains a "$5M revenue" restriction and quoted a "$5–15K/year" license cost. The threshold belongs to the grant, not the license. No such price is published: Team is $499/mo, and Enterprise is custom.

**Recommendation:** Viable CMS, with licensing caveats. See `07`.

---

## 7. Leaflet (map library): dependency, keep

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/Leaflet/Leaflet. Not a fork | VERIFIED |
| License | **BSD-2-Clause** (`LICENSE` at tag v1.9.4 and at HEAD `125bda1e`) | VERIFIED |
| Stable | **v1.9.4 = `d15112c9`, released 2023-05-18**. npm `latest` = 1.9.4 | VERIFIED |
| Development | `main` = 2.0.0-alpha.1 (pre-release 2025-08-16). Last commit 2026-09-19, pushed 2026-10-05 | VERIFIED |
| Runtime dependencies | None (`package.json`) | VERIFIED |
| Plugins | leaflet.markercluster 1.5.3 MIT | VERIFIED (npm) |
| "~40 KB gzipped", "50k+ markers proven" | Not measured | UNVERIFIED |

> Correction: the previous draft gave the v1.9.4 release date as 2024-05-18. It was 2023-05-18.

**Recommendation:** Use Leaflet 1.9.x for the MVP. Re-check 2.0 once it leaves alpha. **INFERRED.** Note the attribution notice in the bundled build.

---

## 8. PostGIS (spatial database extension): dependency, keep

| Item | Finding | Tag |
|---|---|---|
| URL / identity | https://github.com/postgis/postgis. The GitHub repo is a mirror. The README points to the OSGeo Trac/Gitea as the development home | VERIFIED (README) |
| License | **GPL-2.0-or-later** ("version 2 or (at your option) any later version", `LICENSE.TXT`, `COPYING`) | VERIFIED |
| Bundled/linked deps | PROJ (MIT), GEOS (LGPL), GDAL (MIT-style), libxml2 (MIT), SFCGAL (GPLv2+). Docs CC BY-SA 3.0 | VERIFIED (`LICENSE.TXT`) |
| Releases | 3.6.0 (2025-09-01). **Latest stable tag 3.6.4 (2026-06-08)**. 3.7.0rc2 (2026-09-08). `main` = 3.7.0dev | VERIFIED |
| Activity | HEAD `9e97dbf6` 2026-10-11 | VERIFIED |
| Performance (<100 ms viewport) | Not benchmarked | UNVERIFIED |

> Correction: the previous draft gave the latest stable release as 3.6.0 and the latest development release as 3.7.0rc1. Both were stale.

**License assessment (revised):** Your application talks to PostGIS over the PostgreSQL wire protocol (SQL over a socket) in a separate server process. The PostGIS FAQ says the GPL's share-alike terms do not apply to loading data and running queries, so applications may use any license. The FSF GPL FAQ says that programs communicating over sockets are normally separate programs (#MereAggregation), and that running GPL software on a server without distributing it requires no source release (#UnreleasedMods). So a proprietary NestJS app that uses an unmodified PostGIS server is **very likely unaffected** by the GPL. **INFERRED.** Obligations would arise only if PostGIS itself (modified or not) is *distributed* to third parties, for example by shipping a Docker image to a customer. Even then they cover PostGIS, not your app. A short legal review remains *advisable* as general hygiene, but it is **not a blocker**. See `02` §2.

**Recommendation:** Use PostGIS, unmodified, as a separate database service.

---

## Summary table

| Candidate | License (verified) | Role under approved decisions | Notes |
|---|---|---|---|
| TREK | AGPL-3.0 (+ trademark policy) | Reference only | mapbox-gl v3 dependency |
| TRIP | MIT | Reference only | Closest Angular+Leaflet reference |
| Mobilizon | AGPL-3.0 | Reference only | Latest 5.2.4 (not 4.1.0) |
| Tokoro | MPL-2.0 | Reference only | Don't reuse prompts or files |
| Strapi | MIT + Enterprise parts (`ee/`, review-workflows, content-releases) | CMS candidate | Audit logs and review workflows are Enterprise |
| Directus | MSCL-1.0 (source-available) + Innovation Grant | CMS candidate | Native geo, activity log. Grant/Core-limit caveats |
| Leaflet | BSD-2-Clause | Dependency | 1.9.4 (2023-05-18) |
| PostGIS | GPL-2.0-or-later | Dependency | Separate server, SQL only: low risk (INFERRED) |

---

## Verification log (2026-10-11)

- **Method:** Shallow clones (`git clone --depth 1 --filter=blob:none`, sparse for Strapi/Directus) into `%TEMP%\momap-audit\`, outside the repo. Read `LICENSE` and manifests. GitHub REST API / framagit GitLab API for identity, fork status, stars, and release dates. Tag-vs-HEAD license diffs for Strapi and Directus (`diff --strip-trailing-cr`, identical). No code was copied into the repo, and nothing was built or run.
- **Revisions inspected:** TREK `1c05ee4b3ac9` · TRIP `856b1edfe81a` · Mobilizon `f2590486f6ee` · Tokoro `2e3b8eb732eb` · Strapi `5ca3fb208a88` (and tag v5.57.0 `ca3974dac317`) · Directus `8e140f942508` (and tags v12.5.0 `4f77933bf955`, v11.17.4) · Leaflet `125bda1e24d7` (and tag v1.9.4 `d15112c9e8ac`) · PostGIS `9e97dbf69ea7`.
- **Corrections:** Mobilizon latest release (5.2.4, not 4.1.0). Leaflet 1.9.4 date (2023, not 2024). PostGIS latest stable (3.6.4) and rc (3.7.0rc2). Strapi is not plain MIT (EE packages ship in the default install). Directus's $5M threshold is in the grant, not the MSCL, and the "$5–15K/yr" price was unsupported. The PostGIS "legal opinion required" claim is downgraded to "advisable". The Mobilizon-as-a-service and Tokoro-prompt-reuse suggestions are withdrawn under the reference-only policy. The blanket "all VERIFIED" statement has been removed.
- **Still UNVERIFIED:** feature lists of TREK/Mobilizon, TRIP fork count, Tokoro commit count, Leaflet size/performance claims, PostGIS performance, Mobilizon docs site, dependency trees beyond direct manifests (no SBOM/license scan was run).
- **BLOCKED:** confirming the redirect `framasoft/mobilizon` → `kaihuri/mobilizon` (anonymous request gets 302 to sign-in).
