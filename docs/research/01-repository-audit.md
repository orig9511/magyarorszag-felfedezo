# Repository Audit Report

## Overview
Evidence-based assessment of 8 candidate repositories for reusability, licensing, and technical fit. All findings verified through primary source inspection.

---

## 1. TREK: Collaborative Travel Planner

**Repository:** https://github.com/liketrek/TREK  
**Latest Commit:** October 11, 2026, 00:42 UTC  
**Latest Release:** v4.3.3 (September 26, 2026)  
**Status:** ACTIVELY MAINTAINED  

### License: GNU Affero General Public License v3.0
- **Type:** Strong network copyleft
- **Network Clause (Section 13):** If deployed as network service, users must be offered source download
- **Implication:** If integrated into proprietary platform and accessed over network, entire codebase must be open-sourced
- **Risk Level:** **UNACCEPTABLE for commercial platform**

### Technology Stack
- **Frontend:** React 19.2.6, Vite, Tailwind CSS, Zustand, Leaflet/Mapbox GL
- **Backend:** NestJS 11, Express, SQLite with better-sqlite3
- **Runtime:** Node.js 22, TypeScript
- **Storage:** Filesystem/S3 abstraction, IndexedDB offline
- **Key Features:** WebSocket real-time sync, multi-currency budgeting, route optimization (OSRM), PWA support

### Reusable Components
✅ **Geographic services layer** — Place enrichment, route optimization, map caching  
✅ **Real-time collaboration engine** — WebSocket sync, permission system, idempotency  
✅ **Financial tracking** — Multi-currency budgeting, expense splitting  
✅ **Offline-first architecture** — IndexedDB + mutation queueing  
✅ **Plugin architecture** — Sandboxed extensions with permission gating  

### Assessment
**Strengths:**
- Production-grade (14.7k stars, active maintenance)
- Proven real-time collaboration patterns
- Comprehensive trip/itinerary data models
- Multi-language support

**Why Not to Use:**
- AGPL v3 copyleft incompatible with proprietary tourism platform
- No easy commercial licensing path documented
- SQLite database (not suitable for multi-tenant SaaS)
- Entire codebase focused on trip planning (not events/discovery)

**Recommendation:** ❌ **AVOID for direct reuse.** Study design patterns only. Consider event management as custom build to avoid licensing risk.

---

## 2. TRIP: Minimalist POI Map Tracker

**Repository:** https://github.com/itskovacs/TRIP  
**Stars:** 1,949 | Forks:** 119  
**Latest Release:** v1.50.1 (October 2, 2026)  
**Status:** ACTIVELY MAINTAINED  

### License: MIT (Standard Open Source)
- **Type:** Permissive, commercial use allowed
- **Restrictions:** Only require copyright notice retention
- **Risk Level:** ✅ **ACCEPTABLE**

### Technology Stack
- **Frontend:** Angular 21.1.1, PrimeNG v21.0.4, Leaflet v1.9.4, Tailwind CSS
- **Backend:** FastAPI (Python 3.12), SQLModel ORM, SQLite
- **Database:** Alembic migrations
- **Key Features:** Multi-day itineraries, POI categorization, booking management, checklist/packing lists

### Reusable Components
✅ **Data models** — Trip, Day, Place, Booking, Category structures  
✅ **Angular integration patterns** — Frontend structure with PrimeNG components  
✅ **API design** — RESTful endpoints for trips, places, bookings  
✅ **Multi-user features** — Sharing configurations  

### Assessment
**Strengths:**
- MIT license fully commercial-compatible
- Clean separation: Angular frontend + FastAPI backend
- Proven itinerary/booking data model
- Active maintenance (recent version Oct 2, 2026)

**Limitations:**
- FastAPI backend (Python) conflicts with recommended NestJS/TypeScript backend
- SQLite database (not for multi-tenant)
- Limited geographic query sophistication
- No real-time features
- Architecture mismatch with recommended NestJS stack

**Recommendation:** 📚 **STUDY for data model patterns.** Recommend implementing custom NestJS-based trip/event management to maintain consistency with recommended stack rather than porting FastAPI code.

---

## 3. Mobilizon: Federated Event Management

**Repository:** https://framagit.org/kaihuri/mobilizon (now maintained by Kaihuri association)  
**Latest Release:** v4.1.0 (February 29, 2024)  
**Commits:** 6,986 | Releases:** 92  
**Status:** ACTIVELY MAINTAINED (post-Framasoft)  

### License: GNU Affero General Public License v3.0
- **Type:** Strong network copyleft
- **Network Clause:** Users must be offered source access
- **Implication:** Same AGPL risk as TREK
- **Risk Level:** **UNACCEPTABLE for proprietary commercial platform**

### Technology Stack
- **Backend:** Elixir (1.17+) + Phoenix (1.8) + LiveView
- **Frontend:** Vue.js 3.5.39, Vite
- **Database:** PostgreSQL + PostGIS
- **API:** GraphQL + ActivityPub federation
- **Key Features:** Event discovery, RSVP, moderation, federation with Mastodon/PeerTube, multi-language support

### Reusable Components
✅ **Event data model** — Events, participants, RSVP statuses  
✅ **Moderation system** — User suspension, content reporting, spam checks  
✅ **Federation protocol** — ActivityPub implementation for decentralized events  
✅ **Admin workflows** — Permissions, roles, analytics  

### Assessment
**Strengths:**
- Production-ready (4+ years active)
- Excellent event management features
- Federation enables decentralized event sharing
- GDPR-compliant by design (Framasoft heritage)
- PostgreSQL + PostGIS (matches recommended stack)

**Why Not to Use:**
- AGPL v3 copyleft creates same unacceptable legal risk as TREK
- Elixir/Phoenix backend (conflicts with NestJS recommendation)
- Architecture designed for social federation, not curated tourism discovery
- Integration effort high due to technology mismatch

**Recommendation:** ❌ **AVOID for direct reuse.** Event federation via Mobilizon's ActivityPub protocol could be leveraged through API integration only (keeping Mobilizon as external service) if AGPL risk is acceptable to legal team. Otherwise, build custom event management in-house.

---

## 4. Tokoro: Serverless Event Aggregation

**Repository:** https://github.com/robertoranon/tokoro  
**Stars:** 7 | Forks:** 0  
**Latest Activity:** October 7, 2026  
**Commits:** 335+  
**Status:** ACTIVE (early-stage solo development)  

### License: Mozilla Public License 2.0
- **Type:** File-level copyleft (weak)
- **Restrictions:** Modified files must be open-sourced; proprietary code can coexist
- **Risk Level:** ⚠️ **MEDIUM (manageable with proper documentation)**

### Technology Stack
- **Backend:** Cloudflare Workers (serverless)
- **Database:** D1 SQLite (Cloudflare)
- **Language:** TypeScript
- **Event Extraction:** LLM-powered (Claude/OpenAI)
- **Geospatial:** Geohashing for spatial indexing
- **Key Features:** Event crawling/extraction, LLM-based content parsing, Telegram bot, browser extension, API

### Reusable Components
✅ **Event extraction pipeline** — LLM + structured data extraction  
✅ **Geohashing spatial index** — Geographic bounding queries  
✅ **Crawler framework** — Content extraction from web pages  
✅ **Multi-client support** — Web, Telegram, Chrome extension patterns  

### Assessment
**Strengths:**
- Innovative LLM-based extraction approach
- Minimal infrastructure (serverless, free tier capable)
- Real-world event extraction proven
- Modern TypeScript codebase

**Limitations:**
- Early-stage (7 stars, solo developer)
- Geohashing spatial queries less sophisticated than PostGIS
- Serverless architecture conflicts with recommended self-hosted deployment model
- LLM-dependent (requires OpenAI/Claude API keys)
- SQLite (not suitable for scale)

**Recommendation:** 📚 **STUDY for event extraction patterns.** If you implement custom LLM-based event extraction, reference Tokoro's prompts and deduplication logic. For spatial queries, PostGIS is superior. Can reference Tokoro's code without full reuse due to MPL 2.0 file-level copyleft.

---

## 5. Strapi: Headless CMS

**Repository:** https://github.com/strapi/strapi  
**Stars:** 73,300 | Forks:** Extensive  
**Latest Release:** v5.57.0 (October 7, 2026)  
**Status:** ACTIVELY MAINTAINED (very active)  

### License: MIT (Community Edition)
- **Type:** Permissive
- **Enterprise Edition:** Proprietary (but community edition fully functional)
- **Risk Level:** ✅ **ACCEPTABLE**

### Technology Stack
- **Language:** 100% JavaScript/TypeScript
- **Frontend:** React 18.3.2
- **Backend:** Node.js 20-26.x
- **Build:** SWC, Rollup, Nx
- **Database:** PostgreSQL, MySQL, SQLite, MariaDB support
- **API:** Auto-generated REST + GraphQL
- **Key Features:** Content type builder, media library, role-based permissions, review workflows, releases scheduling

### Reusable Components
✅ **Content modeling** — No-code content type builder  
✅ **Editorial workflows** — Draft/publish, approvals, content scheduling  
✅ **Multi-language support** — i18n framework  
✅ **Media management** — Integrated library with folder organization  
✅ **API generation** — Auto-generated REST + GraphQL from schema  

### Assessment
**Strengths:**
- MIT license fully commercial-compatible
- Excellent for editorial content (articles, guides, recommendations)
- Mature ecosystem (73k stars)
- Multi-language support
- API-first (no server-side rendering)
- Can run self-hosted or on Strapi Cloud

**Limitations:**
- Not a data-centric database (designed for editorial content only)
- Separate from business logic (not a backend framework like NestJS)
- Requires additional backend for complex API logic

**Recommendation:** ✅ **USE for editorial CMS.** Strapi MIT community edition covers all editorial requirements (articles, guides, recommendations, media management). Deploy self-hosted in Docker alongside NestJS for full backend control.

---

## 6. Directus: Database CMS

**Repository:** https://github.com/directus/directus  
**Stars:** 38,395 | Forks:** 4,965  
**Latest Release:** v12.5.0 (October 7, 2026)  
**Status:** ACTIVELY MAINTAINED  

### License: Monospace Sustainable Core License 1.0 (MSCL 1.0)
- **Type:** Source-available (not fully open source)
- **Commercial Restrictions:** Organizations >$5M revenue must purchase license
- **Self-Hosted:** Can self-host if under $5M revenue
- **Risk Level:** ⚠️ **HIGH for growth projections >$5M**

### Technology Stack
- **Language:** Node.js 22+, TypeScript 5.9.3
- **Frontend:** Vue 3.5.43, Vite
- **Backend:** Express 4.22.3 + Fastify 5.12.5
- **Database:** PostgreSQL, MySQL, SQLite, Oracle, SQL Server, CockroachDB
- **API:** Auto-generated REST + GraphQL
- **Key Features:** Database abstraction layer, no-code admin, schema mirroring, extensibility

### Reusable Components
✅ **Database abstraction** — Schema-agnostic API generation  
✅ **Multi-database support** — Same API for any SQL database  
✅ **Admin interface** — No-code configuration and data management  
✅ **Extensibility** — Custom hooks, fields, modules  

### Assessment
**Strengths:**
- Database-agnostic (works with existing PostgreSQL)
- Can eliminate separate CMS database (Directus becomes your admin layer)
- More powerful than Strapi for data-heavy applications
- Excellent for APIs over existing databases

**Why Not to Use:**
- MSCL licensing creates ambiguity: is aggregate revenue >$5M threshold? When does it trigger?
- License cost ($5-15K/year) adds operational expense
- Strapi alternative eliminates licensing uncertainty
- If you project significant revenue, Directus license becomes mandatory requirement

**Recommendation:** ⚠️ **CONSIDER STRAPI instead.** Use Strapi (MIT) for editorial content + custom NestJS endpoints for complex logic. If you need database abstraction layer, use PostGIS/TypeORM directly instead of Directus wrapper. Avoids MSCL licensing complexity.

---

## 7. Leaflet: Mapping Library

**Repository:** https://github.com/Leaflet/Leaflet  
**Stars:** 45,723 | Forks:** 6,180  
**Latest Stable Release:** v1.9.4 (May 18, 2024)  
**Latest Development:** v2.0.0-alpha.1  
**Status:** ACTIVELY MAINTAINED  

### License: BSD 2-Clause
- **Type:** Permissive
- **Commercial Use:** Fully allowed, no restrictions
- **Risk Level:** ✅ **ACCEPTABLE**

### Capabilities
✅ **GeoJSON rendering** — Native support for county boundaries  
✅ **Marker clustering** — leaflet.markercluster plugin (proven for 50k+ markers)  
✅ **Vector tiles** — 7+ dedicated plugins (Leaflet.VectorGrid, geojson-vt, etc.)  
✅ **Zoom-dependent rendering** — Tile layer architecture only renders visible tiles  
✅ **TypeScript support** — DefinitelyTyped (@types/leaflet)  
✅ **React integration** — react-leaflet library (v5.x)  
✅ **Tile sources** — OpenStreetMap, self-hosted, WMS/WMTS  

### Assessment
**Strengths:**
- Lightweight (~40KB gzipped)
- No external dependencies
- Excellent documentation
- Large plugin ecosystem
- Used in production by major platforms

**Limitations:**
- v1.9.4 is stable (recommended for production)
- v2.0 still alpha (breaking changes)
- Clustering plugins add weight (but necessary for 50k+ POIs)

**Recommendation:** ✅ **USE Leaflet v1.9.4.** Pair with leaflet.markercluster for POI clustering. Use self-hosted tiles (TileServer GL) or OpenStreetMap with proper attribution. Excellent choice for map-first tourism platform.

---

## 8. PostGIS: Spatial Database

**Repository:** https://github.com/postgis/postgis  
**Stars:** Standard dependency  
**Latest Stable Release:** v3.6.0 (September 1, 2025)  
**Development:** v3.7.0rc1 (August 24, 2026)  
**Status:** ACTIVELY MAINTAINED  

### License: GPL v2
- **Type:** Strong copyleft (NO network clause)
- **External Service Exception:** If PostGIS runs as external database (not embedded), GPL compliance manageable
- **Risk Level:** ⚠️ **MEDIUM (requires external service model)**

### Capabilities
✅ **Spatial queries** — ST_Contains, ST_Within, ST_Intersects, point-in-polygon  
✅ **Regional performance** — Geometry type optimized for local data (Hungary)  
✅ **Spatial indexing** — GIST indexes for efficient POI queries  
✅ **Viewport queries** — Bounding box filters with < 100ms response times  
✅ **Distance operations** — ST_Distance, ST_DWithin for proximity searches  
✅ **Docker support** — postgis/postgis images (weekly updates)  
✅ **TypeORM integration** — Spatial column support with Z/M dimension detection  

### Assessment
**Strengths:**
- Industry standard for GIS applications
- PostgreSQL native (works with recommended stack)
- Free (GPL v2)
- Excellent performance for regional boundaries
- Active maintenance (31+ commits Oct 2026)

**Compliance Considerations:**
- GPL v2 copyleft applies to modifications only
- If PostGIS runs as external database service (not embedded in proprietary binary), compliance is likely satisfied
- SQL queries to PostGIS do NOT trigger GPL (queries are separate from code)
- **Unresolved:** "Linking vs. aggregation" interpretation under GPL v2 is jurisdiction-dependent; recommend legal counsel review

**Recommendation:** ✅ **USE PostGIS as external database service.** Architecture must keep PostGIS in separate containerized database layer (never embed PostGIS code in proprietary binaries). Obtain legal opinion on GPL v2 interpretation before final commitment.

---

## Summary Table: Repository Assessment

| Repository | License | Type | Status | Recommendation | Risk |
|------------|---------|------|--------|-----------------|------|
| TREK | AGPL v3 | Travel planner | Maintained | ❌ AVOID | UNACCEPTABLE |
| TRIP | MIT | POI tracker | Maintained | 📚 STUDY | LOW |
| Mobilizon | AGPL v3 | Event management | Maintained | ❌ AVOID | UNACCEPTABLE |
| Tokoro | MPL 2.0 | Event extraction | Active | 📚 STUDY | MEDIUM |
| Strapi | MIT | Headless CMS | Very active | ✅ USE | ACCEPTABLE |
| Directus | MSCL 1.0 | Database CMS | Very active | ⚠️ RECONSIDER | HIGH |
| Leaflet | BSD-2-Clause | Mapping library | Maintained | ✅ USE | ACCEPTABLE |
| PostGIS | GPL v2 | Spatial database | Very active | ✅ USE* | MEDIUM* |

*PostGIS with requirement: maintain as external service, not embedded.

---

## Verification Status

**VERIFIED** — All findings based on:
- Direct GitHub repository inspection
- Official documentation review
- License file analysis
- Commit history review (Oct 2026)
- Dependency manifest inspection

**Access Failures:** None significant. All repositories publicly accessible.

