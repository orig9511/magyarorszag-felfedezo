# Architecture Proposal

## System Overview

A **modular, geographically-optimized, compliance-first architecture** designed for map-first tourism discovery, scalability to 500k+ POIs, and future monetization.

---

## Recommended Technology Stack

```
Layer               Technology              Rationale
─────────────────────────────────────────────────────────
Presentation        Angular 21+ + Tailwind  Proven mobile support, type-safe
Mapping             Leaflet 1.9.4           Lightweight, plugin ecosystem
Frontend Build      Vite + TypeScript       Fast dev experience, modern tooling
State Management    NgRx or service-based   Angular best practices
Real-time           WebSocket               Map updates, collaborative features

API Gateway         NestJS 11               Modular, type-safe, GraphQL + REST
Backend Services    NestJS modules (8)      Separation of concerns
Data Access         TypeORM + PostgreSQL    Type-safe queries, migrations
Cache/Queue         Redis 7                 Fast caching, job distribution
Workers             Python + Celery/RQ      Data processing libraries

Database            PostgreSQL 17           Production-grade, PostGIS support
Geospatial          PostGIS 3.6             Native spatial indexes, proven
Search (optional)   Elasticsearch           Full-text POI/event search
CMS                 Strapi (MIT)            Editorial workflow, REST/GraphQL
Secrets             HashiCorp Vault         Secure credential management

Deployment          Docker Compose (dev)    Local consistency
                    Kubernetes (prod)       Horizontal scaling
                    Container Registry      Image distribution
Monitoring          Prometheus + Grafana    Metrics and visualization
Logging             ELK Stack or Loki       Centralized log aggregation
```

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT LAYER                                                     │
│ ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│ │ Web Browser     │  │ Mobile PWA   │  │ Desktop PWA     │    │
│ │ (Angular app)   │  │ (iOS/Android)│  │ (Offline)       │    │
│ └────────┬────────┘  └──────┬───────┘  └────────┬────────┘    │
│          │                   │                    │              │
│          └───────────────────┼────────────────────┘              │
│                              │                                   │
├──────────────────────────────┼──────────────────────────────────┤
│ PRESENTATION LAYER                                               │
│ Leaflet Map                  │  Components (Discovery, Editorial)│
│ - County activation          │  - POI listing                    │
│ - Viewport POI query         │  - Event details                  │
│ - Clustering                 │  - Article view                   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                      ┌────────▼─────────┐
                      │ HTTPS / WebSocket│
                      │ (API Gateway)    │
                      └────────┬─────────┘
                               │
├──────────────────────────────┼──────────────────────────────────┤
│ API LAYER (NestJS)                                               │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ HTTP Layer: Rate Limiting, CORS, Authentication         │   │
│ └──────┬───────────┬────────────┬───────────┬──────────────┘   │
│        │           │            │           │                   │
│   ┌────▼──┐    ┌───▼────┐  ┌───▼─────┐ ┌──▼────┐ ┌──────────┐│
│   │Geography Module     │  │Discovery │ │Events │ │Editorial ││
│   │- Counties         │  │- POIs    │ │Module │ │Module   ││
│   │- Settlements      │  │- Search  │ │- CRUD │ │- Create ││
│   │- Boundaries       │  │- Filter  │ │       │ │- Publish││
│   └─────────────────┘  └──────────┘  └───────┘ └─────────┘│
│                                                              │
│   ┌──────────────┐ ┌─────────────┐ ┌──────────┐ ┌───────┐  │
│   │Auth Module   │ │Moderation   │ │GDPR      │ │Health │  │
│   │- JWT         │ │- Flags      │ │- Export  │ │- Ping │  │
│   │- OAUTH       │ │- Suspend    │ │- Erasure │ │       │  │
│   │- MFA         │ │- Audit      │ │- Access  │ └───────┘  │
│   └──────────────┘ └─────────────┘ └──────────┘             │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │Business Module (Future Monetization)                 │  │
│   │- Sponsored listings  - Business accounts             │  │
│   │- Impressions/clicks  - Analytics                     │  │
│   └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼──────┐  ┌──────▼────────┐  ┌────▼──────┐
   │PostgreSQL │  │Redis Cache    │  │Elasticsearch
   │+ PostGIS  │  │+ Job Queue    │  │(Optional)
   │           │  │               │  │
   │ Tables:   │  │ Cache keys:   │  │
   │ counties  │  │ viewport_*    │  │ POI index
   │ pois      │  │ event_*       │  │ Event index
   │ events    │  │ article_*     │  │
   │ articles  │  │ user_*        │  │
   │ users     │  │               │  │
   │ audit_log │  │ Job queue:    │  │
   │           │  │ crawlers      │  │
   └───────────┘  │ dedup         │  │
                  │ notifications │  │
                  └───────────────┘  └───────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
   ┌────▼──────────┐          ┌────────▼───────┐
   │ Workers Layer │          │ Strapi CMS     │
   │               │          │ (Editorial)    │
   │ Python jobs:  │          │                │
   │ - OSM crawler │          │ Database:      │
   │ - Wikidata    │          │ PostgreSQL     │
   │ - Mobilizon   │          │                │
   │ - kulturinfo  │          │ API:           │
   │ - Deduplicate │          │ REST + GraphQL │
   │ - Image proc  │          │                │
   └───────────────┘          └────────────────┘
```

---

## Data Model (15 Core Entities)

### Geography Module
```sql
-- County boundaries (OSM/KSH data)
CREATE TABLE counties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    code VARCHAR(10),
    geometry GEOMETRY(Polygon, 4326),
    active BOOLEAN DEFAULT false,
    UNIQUE(code)
);
CREATE INDEX idx_counties_geom ON counties USING GIST(geometry);

-- Settlements and administrative units
CREATE TABLE settlements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    county_id INTEGER REFERENCES counties(id),
    coordinates GEOMETRY(Point, 4326),
    type VARCHAR(50), -- town, village, city
    population INTEGER,
    FOREIGN KEY(county_id) REFERENCES counties(id)
);
CREATE INDEX idx_settlements_geom ON settlements USING GIST(coordinates);
CREATE INDEX idx_settlements_county ON settlements(county_id);
```

### Discovery Module
```sql
-- Points of Interest
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coordinates GEOMETRY(Point, 4326) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    rating DECIMAL(3, 2),
    review_count INTEGER DEFAULT 0,
    source_url TEXT,
    source_license VARCHAR(50), -- ODbL, CC0, CC-BY, etc.
    attribution_required BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE INDEX idx_pois_geom ON pois USING GIST(coordinates);
CREATE INDEX idx_pois_category ON pois(category_id);
CREATE INDEX idx_pois_updated ON pois(updated_at);

-- Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    icon VARCHAR(50),
    color VARCHAR(7)
);
```

### Events Module
```sql
-- Events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    coordinates GEOMETRY(Point, 4326),
    venue_name VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    event_url TEXT,
    category VARCHAR(50),
    source_url TEXT,
    source_license VARCHAR(50),
    canceled BOOLEAN DEFAULT false,
    confidence_score DECIMAL(3, 2), -- 0.0-1.0
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_events_time ON events(start_time, end_time);
CREATE INDEX idx_events_geom ON events USING GIST(coordinates);
CREATE INDEX idx_events_updated ON events(updated_at);
```

### Editorial Module
```sql
-- Articles, guides, recommendations
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    content TEXT,
    featured_image_id INTEGER,
    published_at TIMESTAMP,
    author_id INTEGER,
    language VARCHAR(10), -- 'hu', 'en'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY(author_id) REFERENCES users(id)
);
```

### Moderation Module
```sql
-- User flags/reports
CREATE TABLE flags (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50), -- 'poi', 'event', 'article'
    entity_id INTEGER,
    reason VARCHAR(255),
    description TEXT,
    flagged_by_user_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, dismissed
    resolved_at TIMESTAMP,
    resolved_by_user_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY(flagged_by_user_id) REFERENCES users(id),
    FOREIGN KEY(resolved_by_user_id) REFERENCES users(id)
);

-- Audit log (GDPR requirement)
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    changes JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

---

## API Design

### REST Endpoints Summary

**Geography:**
- GET /api/v1/counties — List all counties
- GET /api/v1/counties/:id — County details + boundaries
- PUT /api/v1/counties/:id/activate — Activate county for user

**Discovery:**
- GET /api/v1/pois?bbox=&category=&limit= — Viewport-based POI query
- GET /api/v1/pois/:id — POI details with reviews
- GET /api/v1/pois/search?q= — Full-text search

**Events:**
- GET /api/v1/events?start_date=&end_date=&bbox= — Event discovery
- GET /api/v1/events/:id — Event details

**Editorial:**
- GET /api/v1/articles — List articles
- GET /api/v1/articles/:slug — Article content

**Authentication:**
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- DELETE /api/v1/auth/logout

**GDPR:**
- POST /api/v1/gdpr/export — User data export
- DELETE /api/v1/gdpr/erasure — Request account deletion
- GET /api/v1/gdpr/access/:token — Confirm data access

### GraphQL Schema (Key Types)

```graphql
type County {
  id: ID!
  name: String!
  geometry: Geometry!
  active: Boolean!
  pois: [POI!]!
}

type POI {
  id: ID!
  name: String!
  category: String!
  coordinates: Point!
  rating: Float
  sourceAttribution: SourceAttribution!
}

type Event {
  id: ID!
  title: String!
  startTime: DateTime!
  endTime: DateTime
  venue: String
  coordinates: Point
  sourceUrl: String
}

type Article {
  id: ID!
  title: String!
  slug: String!
  content: String!
  publishedAt: DateTime
}

type Query {
  county(id: ID!): County
  countiesInViewport(bbox: BoundingBox!): [County!]!
  poisNear(latitude: Float!, longitude: Float!, radiusKm: Int!): [POI!]!
  eventsInDateRange(start: DateTime!, end: DateTime!): [Event!]!
  articles(language: String): [Article!]!
}

type Mutation {
  reportPOI(poiId: ID!, reason: String!): Flag!
  createFavorite(poiId: ID!): Favorite!
}

type Subscription {
  eventNearby(latitude: Float!, longitude: Float!): Event
}
```

---

## Implementation Phases (20 Weeks)

| Phase | Weeks | Scope | Deliverable |
|-------|-------|-------|-------------|
| **Foundation** | 1-4 | Database schema, API skeleton, PostGIS setup, Leaflet map | Working map + API foundation |
| **Discovery** | 5-8 | Viewport queries, clustering, favorites, filtering | Fully functional POI discovery |
| **Events/Editorial** | 9-12 | Event crawler, Strapi integration, article publishing | Events + guides live |
| **Quality/Compliance** | 13-16 | Deduplication engine, GDPR, moderation, security hardening | Production-ready platform |
| **Monetization** | 17-20 | Sponsored listings, business accounts, analytics | Soft launch + business model |

---

## Directory Structure (Monorepo)

```
momap/
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── county.ts
│   │   │   │   ├── poi.ts
│   │   │   │   ├── event.ts
│   │   │   │   └── user.ts
│   │   │   ├── constants/
│   │   │   │   ├── categories.ts
│   │   │   │   └── licenses.ts
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── geography/ (counties, settlements)
│   │   │   │   ├── discovery/ (POIs, search)
│   │   │   │   ├── events/ (CRUD, queries)
│   │   │   │   ├── editorial/ (articles, Strapi sync)
│   │   │   │   ├── auth/ (JWT, OAUTH, MFA)
│   │   │   │   ├── moderation/ (flags, audit)
│   │   │   │   ├── gdpr/ (export, erasure)
│   │   │   │   ├── business/ (monetization layer)
│   │   │   │   └── health/ (ping, status)
│   │   │   ├── database/
│   │   │   │   ├── typeorm.config.ts
│   │   │   │   ├── entities/ (all 15 models)
│   │   │   │   └── migrations/
│   │   │   ├── services/ (business logic)
│   │   │   ├── guards/ (auth, permissions)
│   │   │   └── interceptors/ (logging, caching)
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.component.ts
│   │   │   ├── app.routes.ts
│   │   │   ├── modules/
│   │   │   │   ├── map/ (Leaflet integration, county activation)
│   │   │   │   ├── discovery/ (POI list, search, filter)
│   │   │   │   ├── events/ (event calendar, details)
│   │   │   │   ├── editorial/ (article list, reader)
│   │   │   │   ├── auth/ (login, register, profile)
│   │   │   │   └── admin/ (moderation, analytics)
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── cache.service.ts
│   │   │   ├── styles/ (Tailwind)
│   │   │   └── environments/
│   │   ├── public/ (assets, icons)
│   │   ├── package.json
│   │   └── angular.json
│   │
│   ├── workers/
│   │   ├── crawlers/
│   │   │   ├── osm_crawler.py
│   │   │   ├── wikidata_crawler.py
│   │   │   ├── mobilizon_crawler.py
│   │   │   └── kulturinfo_crawler.py
│   │   ├── deduplication/
│   │   │   ├── dedup_engine.py
│   │   │   └── fuzzy_matcher.py
│   │   ├── tasks.py (Celery tasks)
│   │   └── requirements.txt
│   │
│   └── cms/
│       ├── config/ (Strapi customization)
│       ├── types/ (extension types)
│       └── package.json
│
├── database/
│   ├── schema.sql (all 15 tables)
│   ├── migrations/ (numbered SQL files)
│   ├── seeds/ (initial data: counties, categories)
│   └── indexes.sql
│
├── docs/
│   ├── research/ (this audit)
│   ├── api/ (OpenAPI/GraphQL schema)
│   └── deployment/
│
├── infra/
│   ├── docker-compose.yml (local development)
│   ├── docker-compose.prod.yml
│   ├── k8s/ (Kubernetes manifests)
│   ├── nginx/ (reverse proxy)
│   └── prometheus/ (monitoring)
│
├── scripts/
│   ├── setup.sh (one-time setup)
│   ├── dev.sh (local development)
│   ├── test.sh (run tests)
│   └── deploy.sh (deployment automation)
│
└── package.json (monorepo root)
```

---

## Performance Targets

| Query | Target | Notes |
|-------|--------|-------|
| Viewport POI query | < 100ms | Cached 5 min; GiST index on coordinates |
| Nearby POI search | < 50ms | ST_DWithin with spatial index |
| Event queries | < 150ms | Indexed on start_date + coordinates |
| Article listing | < 200ms | Paginated, cached |
| Search (full-text) | < 500ms | Optional Elasticsearch for scale |
| Startup load | < 2s | Lazy-load modules |

**Cache hit rate target:** > 60%

---

## Deployment Considerations

**Local Development:**
- Docker Compose with PostgreSQL, Redis, Strapi containers
- One-command start: `docker-compose up -d && npm run dev`

**Production:**
- Kubernetes with auto-scaling (pods based on CPU/memory)
- PostgreSQL managed database (AWS RDS, Azure Database, etc.)
- Redis managed cache (AWS ElastiCache, etc.)
- Object storage for images (S3-compatible)
- CDN for static assets and map tiles (CloudFlare, CloudFront)

**Monitoring:**
- Prometheus for metrics
- Grafana for dashboards
- ELK/Loki for centralized logging
- PagerDuty for alerts

---

## Conclusion

This architecture is:
- ✅ **Geographic-first:** All queries optimized for spatial operations
- ✅ **Type-safe:** TypeScript throughout
- ✅ **Scalable:** Handles 500k+ POIs without architectural changes
- ✅ **Compliant:** GDPR, licensing, attribution built-in
- ✅ **Future-proof:** Monetization layer prepared
- ✅ **Pragmatic:** No over-engineering, proven technologies

