# MOMAP — Development Roadmap & Project Memory

**Project:** Magyarországi térképes felfedező- és turisztikai platform  
**Repository:** orig9511/magyarorszag-felfedezo  
**Development branch:** feature/initial-implementation  
**Last updated:** 2026-10-12

---

## 1. PROJECT VISION

A Momap egy Magyarországra fókuszáló, interaktív,
térképközpontú turisztikai és eseményfelfedező platform.

Két fő pillére:

### Events
- Koncertek, fesztiválok, bulik és klubestek.
- Kulturális és városi rendezvények.
- Sportesemények.
- Kisebb települések helyi programjai.

### Points of Interest
- Várak, kastélyok és műemlékek.
- Múzeumok és történelmi helyszínek.
- Természeti látványosságok.
- Kilátók, parkok és túracélpontok.

**Initial pilot:** Budapest és Debrecen.

---

## 2. TECH STACK

Frontend:
- Angular
- TypeScript
- MapLibre

Backend:
- NestJS
- TypeORM
- PostgreSQL
- PostGIS

Data ingestion:
- Source-specific adapters
- Scheduled background processing
- Normalization and deduplication

IMPORTANT:
Preserve the existing architecture.
Do not rebuild working components unnecessarily.

---

## 3. CURRENT REPOSITORY STATUS

The active application is located in:

feature/initial-implementation

Existing components identified:

- Angular frontend
- Landing page
- Interactive map
- MapLibre integration
- POI management
- Event management
- County and settlement modules
- PostgreSQL/PostGIS integration
- OSM adapter
- Wikidata adapter
- Ticketmaster adapter
- CSV/JSON event import
- Ingestion scheduler

NOTE:
These components exist in the repository.
Their runtime behavior and completeness
have not all been verified.

---

## 4. CONFIRMED DEVELOPMENT DECISIONS

### 4.1 Event Collection

Use targeted source discovery.

Potential sources:
- Municipal websites
- Cultural centers
- Concert venues
- Festivals
- Theaters
- Local tourism organizations

Use APIs, structured data or permitted extraction.

Each event should contain:
- Title
- Description
- Start and end time
- Location
- Settlement
- Coordinates
- Category
- Performers when available
- Source URL
- Attribution and license metadata

Implement cross-source deduplication.

### 4.2 Event Monitor

Automatically check events for changes.

Initial proposed intervals:

- More than 30 days: weekly
- 7–30 days: daily
- 1–7 days: every 6 hours
- 2–24 hours: every 1–2 hours
- Less than 2 hours: every 30 minutes

Adjust according to source restrictions.

Track:
- Schedule changes
- Location changes
- Cancellations
- Postponements
- Source availability

An unavailable source must not
automatically mark an event as cancelled.

### 4.3 Permanent Attractions

Import permanent POIs into PostgreSQL/PostGIS.

Use targeted updates instead of
repeated full imports.

Potential sources:
- OpenStreetMap
- Wikidata
- Other verified datasets

Respect licensing and attribution.

### 4.4 Map Experience

Keep MapLibre.

Planned improvements:
- Smooth zooming and panning
- Efficient viewport requests
- Marker clustering
- Reduced unnecessary rendering
- Improved loading performance
- Hungary visually emphasized
- Neighboring countries faded
- Subtle Hungarian border highlight

Prefer a lightweight geographical mask
before attempting GPU-intensive blur.

---

## 5. DEVELOPMENT BACKLOG

### P0 — Repository Audit

- [ ] P0-01 Complete repository architecture audit
- [ ] P0-02 Verify frontend and backend builds
- [ ] P0-03 Review database entities and migrations
- [ ] P0-04 Review environment configuration
- [ ] P0-05 Align documentation with actual code

### P1 — Map Optimization

- [ ] P1-01 Investigate map performance
- [ ] P1-02 Optimize viewport data loading
- [ ] P1-03 Implement or verify marker clustering
- [ ] P1-04 Implement Hungary focus overlay
- [ ] P1-05 Review production map tile provider

### P1 — POI System

- [ ] P1-06 Review OSM and Wikidata adapters
- [ ] P1-07 Replace recurring full POI imports
- [ ] P1-08 Verify county and settlement mapping
- [ ] P1-09 Improve POI deduplication

### P1 — Event Intelligence

- [ ] P1-10 Audit existing event ingestion
- [ ] P1-11 Build verified event source registry
- [ ] P1-12 Research reusable open-source collectors
- [ ] P1-13 Integrate first local event source
- [ ] P1-14 Improve event normalization
- [ ] P1-15 Implement cross-source deduplication

### P2 — Event Monitoring

- [ ] P2-01 Design adaptive monitoring scheduler
- [ ] P2-02 Implement event change detection
- [ ] P2-03 Implement event change history
- [ ] P2-04 Implement source failure handling
- [ ] P2-05 Test cancellation and postponement logic

### P3 — Expansion

- [ ] P3-01 Validate Budapest pilot
- [ ] P3-02 Validate Debrecen pilot
- [ ] P3-03 Expand to additional cities
- [ ] P3-04 Improve data quality and coverage

---

## 6. DEVELOPMENT RULES

1. Read this file before starting development.

2. Inspect existing code before implementing
   new functionality.

3. Avoid unnecessary rewrites.

4. Preserve existing database data.

5. Use small, reviewable changes.

6. Never mark a task completed without
   verifying the implementation.

7. Update this file after every completed task.

8. Document modified files and test results.

9. Do not merge into main without approval.

10. Keep the project memory synchronized
    with actual repository changes.

---

## 7. REQUIRED OUTPUT FORMAT

After every development task, provide:

### OUTPUT

**Task ID:**
**Status:** Completed / Partial / Blocked

**Branch:**
**Modified files:**

**Changes made:**

**Verification:**
- Tests executed
- Build status
- Remaining issues

**Risks:**

**Next recommended task:**

---

## 8. DEVELOPMENT HISTORY

### 2026-10-12 — PM-001

Task:
Initial project review and roadmap consolidation.

Findings:
- Existing application identified in development branch.
- Event ingestion infrastructure already exists.
- POI ingestion scheduling requires review.
- Event monitoring requires further implementation.
- Map performance requires investigation.
- Production map tile provider requires review.

Verification:
Source code inspection only.
No runtime tests executed.

Next:
P0-01 — Complete repository architecture audit.

---

## 9. PROJECT MEMORY POLICY

This file is the project's persistent
development memory.

It must reflect:
- Confirmed decisions
- Actual implementation status
- Outstanding tasks
- Completed changes
- Test results
- Known issues
- Next development steps

The repository code and verified test results
remain the source of truth.

Never invent completed work.