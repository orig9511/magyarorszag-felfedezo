# Executive Summary: Momap Technical Audit

## Project Overview
Comprehensive technical, licensing, and architectural audit for **Magyarországi térképes felfedező- és turisztikai platform (momap)** — a premium, map-first tourism and local-discovery platform for Hungary.

**Audit Date:** October 2026  
**Status:** COMPLETE - Ready for stakeholder review and engineering implementation

---

## Recommended Overall Architecture

A **modular, geographically-optimized, compliance-first architecture** using:

```
Frontend:           Angular 21+ + Leaflet + Tailwind CSS + PWA
Backend API:        NestJS 11 + TypeScript
Database:           PostgreSQL 17 + PostGIS 3.6
Cache/Queue:        Redis 7
CMS:                Strapi (MIT community edition)
Workers:            Python + Celery/RQ
Deployment:         Docker Compose + Kubernetes-ready
Data Sources:       OpenStreetMap, Wikidata, Mobilizon, kulturinfo (all free/compliant)
```

**Why this stack:**
- ✅ Zero licensing costs (all MIT/BSD/CC0/ODbL)
- ✅ Geographic optimization (PostGIS spatial indexes for <100ms viewport queries)
- ✅ Type-safe end-to-end (TypeScript throughout)
- ✅ Production-ready (proven technologies, active maintenance)
- ✅ Compliance-by-design (GDPR, licensing, attribution built-in)
- ✅ Scalable (handles 500k+ POIs without architectural changes)
- ✅ Future-proof (monetization layer prepared for sponsored listings/ads)

---

## Decision Matrix: What to Reuse, What to Build

### TIER 1: Direct Reuse ✅
| Candidate | Status | Component | Rationale |
|-----------|--------|-----------|-----------|
| **Leaflet** | ✅ USE | Mapping library | BSD-2-Clause license, proven performance, native GeoJSON support, clustering plugins |
| **PostGIS** | ✅ USE | Spatial database | GPL v2 (manageable if external), native county/settlement queries, proven reliability |
| **Strapi** | ✅ USE | Editorial CMS | MIT community edition, REST/GraphQL auto-generated, role-based workflows |

### TIER 2: API Integration Only ⚠️
| Candidate | Status | Component | Rationale |
|-----------|--------|-----------|-----------|
| **TREK** | ❌ AVOID | Event/trip management | AGPL v3 network copyleft creates unacceptable legal risk for proprietary platform |
| **Mobilizon** | ❌ AVOID | Event federation | AGPL v3 network copyleft; same legal risk as TREK |
| **Tokoro** | ⚠️ CONDITIONAL | Event extraction/crawling | MPL 2.0 file-level copyleft manageable IF not modified; LOW code reuse due to different architecture |

### TIER 3: Design Inspiration Only 📚
| Candidate | Status | Component | Rationale |
|-----------|--------|-----------|-----------|
| **TRIP** | 📚 STUDY | Data models, trip planning | MIT license permits reuse; clean architecture for trip/itinerary/booking models; recommend adapting ERD rather than reusing code directly |

### TIER 4: NOT RECOMMENDED ❌
| Candidate | Status | Reason |
|-----------|--------|--------|
| **Directus** | ❌ AVOID (for self-hosted) | MSCL 1.0 commercial licensing requires payment for organizations >$5M revenue; Strapi MIT alternative eliminates this risk |

---

## Licensing Compliance: Critical Findings

### ✅ SAFE Combinations
- **Frontend:** Angular + Leaflet + Strapi = MIT/BSD-2/MIT (fully proprietary platform allowed)
- **Backend:** NestJS + PostgreSQL + PostGIS = Any/MIT/GPL v2 (GPL compliant if PostGIS remains external service)
- **Data sources:** OpenStreetMap (ODbL) + Wikidata (CC0) + kulturinfo (CC-BY) = All commercial-use compliant

### ❌ UNACCEPTABLE Combinations
- **AGPL v3 (TREK/Mobilizon) + proprietary platform:** Network copyleft clause demands open-sourcing entire codebase if users interact over network. NO EXCEPTIONS for commercial wrappers.
- **PostGIS GPL v2 + proprietary embedded code:** Only safe if PostGIS remains external database service, never embedded/linked into proprietary binaries.

### ⚠️ REQUIRES LEGAL REVIEW
- **PostGIS linking interpretation:** Whether SQL queries to external database constitute "linking" under GPL v2 is jurisdiction-dependent. Recommend obtaining legal opinion before final architecture decision.
- **Tokoro MPL 2.0 modifications:** File-level copyleft manageable; if you modify Tokoro, only those files must be open-sourced.

### 📋 Compliance Obligations
- **OpenStreetMap (ODbL 1.0):** Attribution required; share-alike applies to derivative maps
- **Wikidata (CC0):** Attribution optional; no restrictions
- **kulturinfo (CC-BY):** Attribution required
- **All data sources:** Must implement data source tracking and attribution display

---

## Data Acquisition Strategy: VERIFIED & COMPLIANT

**Primary Free Sources (All verified, all commercial-use permitted):**
1. **OpenStreetMap** — Counties, settlements, POI base data, restaurants, attractions (ODbL 1.0)
2. **Wikidata** — Cultural venues, museums, historical sites (CC0)
3. **Mobilizon Federation** — Decentralized events (GDPR-compliant by design)
4. **kulturinfo.hu** — Official Hungarian cultural institutions (CC-BY)

**Data Ingestion Architecture:**
- Background workers (Python/Celery) for crawling
- Deduplication engine (fuzzy matching + spatial clustering)
- Moderation workflow for user-submitted content
- Event lifecycle management (cancellation detection, expiration)
- 24-hour GDPR takedown SLA

**Cost:** $0/month (all sources free; only optional Google Places verification at $960/month if desired)

---

## Security & Compliance Status

### 🚨 CRITICAL BLOCKERS (Must fix before public launch)
1. **Secrets in Git:** .env files must never be committed; implement pre-commit hooks
2. **OSM Attribution:** All map data must include OpenStreetMap attribution; non-negotiable license requirement
3. **GDPR Erasure:** User data deletion endpoint must be implemented and tested before launch
4. **Login Rate Limiting:** Redis-backed rate limiter required to prevent credential-stuffing attacks

### ⚠️ MEDIUM-PRIORITY RISKS (Fix before Beta)
- Database encryption at rest (PostgreSQL pgcrypto)
- JWT refresh token rotation strategy
- API input validation (NestJS validation pipes)
- Dependency vulnerability scanning (npm/pip audit in CI/CD)
- Incident response playbook and escalation procedures

### ✅ STRENGTHS
- Architecture supports GDPR by design (data minimization, role-based access)
- License compliance baked into data model (source attribution tracking)
- PostgreSQL + PostGIS can be hardened (no inherent vulnerabilities identified)
- Strapi API-first design reduces XSS attack surface vs. server-side rendering

---

## Implementation Roadmap (20 Weeks)

| Phase | Weeks | Focus | Deliverable |
|-------|-------|-------|-------------|
| **Foundation** | 1-4 | Database schema, API skeleton, PostGIS setup, Leaflet map | Database + API foundation working |
| **Discovery** | 5-8 | Viewport POI queries, clustering, filtering, favorites | POI discovery fully functional |
| **Events & Editorial** | 9-12 | Event crawler, Strapi integration, article publishing | Events + guides live |
| **Quality & Compliance** | 13-16 | Deduplication, GDPR implementation, moderation workflows | Production-ready compliance |
| **Monetization** | 17-20 | Sponsored listings, business accounts, analytics | Soft launch + business model |

**Estimated effort:** 4-5 engineers, €88K-€135K development, €3K-€7K/month operations

---

## Major Licensing & Security Decisions Requiring Human Approval

1. **AGPL v3 Rejection:** Confirm that TREK/Mobilizon's AGPL v3 licensing creates unacceptable legal risk for bootstrapped commercial venture. Alternative: build custom event management in-house or obtain commercial licensing exception from TREK/Mobilizon maintainers.

2. **PostGIS External Service Model:** Confirm architecture keeps PostGIS as external database (never embedded/linked in proprietary binaries) to satisfy GPL v2 compliance. Obtain legal counsel opinion if architecture changes.

3. **OpenStreetMap Attribution:** Implement and verify attribution display meets ODbL requirements. Non-compliance is automatic license violation.

4. **Data Source Partnerships:** Prioritize contacting Hungarian tourism boards and event aggregators (Jegy.hu, budapest.com) for potential data partnerships; official partnerships reduce reliance on automated crawling.

---

## Estimated Relative Effort

| Category | Effort | Notes |
|----------|--------|-------|
| **Frontend (Angular + Leaflet)** | MEDIUM | Standard web app complexity; map interactions tested in Leaflet ecosystem |
| **Backend (NestJS)** | MEDIUM-HIGH | 8 modules, stateless services, multiple data sources; typical microservice challenges |
| **Database (PostgreSQL + PostGIS)** | MEDIUM | Spatial indexing requires expertise; GIST indexes critical for performance |
| **Data Ingestion** | MEDIUM | Deduplication and crawler reliability add complexity; OSM/Wikidata APIs documented |
| **Compliance (GDPR/Licensing)** | LOW-MEDIUM | Framework documented; implementation straightforward if done early |
| **Security Hardening** | MEDIUM | Standard practices; no novel threats identified |
| **Deployment & Monitoring** | MEDIUM | Docker/K8s templates provided; standard observability stack |

**Overall:** MEDIUM-HIGH complexity for a 4-5 person team over 20 weeks. No unknown technical risks identified.

---

## Unresolved Questions Requiring Decisions

1. **Event Data Priority:** Budapest & Debrecen first (staged rollout) or nationwide from day one?
2. **Payment Processing:** Required at launch or post-MVP? (Affects monetization urgency)
3. **Multi-Language Support:** Immediate (HU + EN) or phased?
4. **Offline Mode:** Required for MVP or Phase 2?
5. **Analytics & Attribution:** What level of event/search tracking acceptable under GDPR?
6. **Directus vs. Custom CMS:** If revenue >$5M projected, will commercial Directus license cost be acceptable or switch to Strapi early?

---

## Next Steps: Pre-Implementation Checklist

- [ ] Stakeholders approve recommended architecture (Angel/Tier 1 stack)
- [ ] Legal counsel reviews PostGIS GPL v2 interpretation for your deployment model
- [ ] Product team confirms phasing questions (event data priority, multi-language, etc.)
- [ ] Team assembles (4-5 engineers: 2 frontend, 2 backend, 1 data/DevOps)
- [ ] Setup development environment (Docker Compose provided in architecture docs)
- [ ] Create Phase 1 sprint plan (Weeks 1-4: database + API foundation)

---

## Conclusion

The recommended architecture is **technically sound, licensing-compliant, and immediately implementable**. Major risks (AGPL copyleft, PostGIS GPL v2 interpretation) are manageable through architectural choices and legal review. No show-stopping blockers identified. Ready for engineering team to begin Phase 1 implementation.

**Estimated time to MVP:** 12 weeks (Phases 1-3)  
**Estimated time to production-ready:** 16 weeks (add Phase 4 compliance)  
**Estimated time to monetization-ready:** 20 weeks (add Phase 5)

---

**For detailed findings, see:**
- `01-repository-audit.md` — Individual technology deep-dives
- `02-license-and-compliance.md` — Legal analysis and compliance roadmap
- `03-architecture-proposal.md` — System design, data models, API specs
- `04-geospatial-data-and-mapping.md` — Map licensing and performance optimization
- `05-event-and-poi-ingestion.md` — Data acquisition strategy and compliance
- `06-security-and-operations.md` — Risk assessment and hardening roadmap
- `07-cms-and-monetization.md` — Strapi vs. alternatives, future business model
- `08-implementation-roadmap.md` — Week-by-week execution plan
- `10-source-register.md` — Evidence log with URLs and access dates
