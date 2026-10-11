# Implementation Roadmap

## Phase-by-Phase Plan (20 Weeks)

### PHASE 1: Foundation (Weeks 1-4)
**Goal:** Database + API skeleton working

**Week 1-2: Setup & Infrastructure**
- [ ] Repository setup (monorepo, branches, CI/CD)
- [ ] Docker Compose environment (postgres, redis, strapi)
- [ ] Database schema creation (all 15 tables)
- [ ] Pre-commit hooks (prevent .env commits)
- [ ] GitHub Actions CI pipeline

**Week 2-3: Backend Foundation**
- [ ] NestJS project scaffold (8 modules)
- [ ] TypeORM + PostGIS integration
- [ ] Authentication module (JWT)
- [ ] CORS + rate limiting setup
- [ ] API documentation (OpenAPI/Swagger)

**Week 3-4: Frontend Foundation**
- [ ] Angular project scaffold
- [ ] Leaflet map integration
- [ ] County boundaries GeoJSON import
- [ ] Basic UI layout (map + sidebar)
- [ ] Environment configuration

**Deliverable:** Both frontend/backend running locally, map displays counties.

---

### PHASE 2: Discovery (Weeks 5-8)
**Goal:** POI discovery fully functional

**Week 5-6: Geographic Queries**
- [ ] Viewport POI query endpoint (< 100ms)
- [ ] Spatial indexing (GIST on coordinates)
- [ ] Nearby POI search (< 50ms)
- [ ] POI filtering by category
- [ ] Leaflet marker rendering + clustering

**Week 6-7: Search & Filtering**
- [ ] Full-text search (Elasticsearch or PostgreSQL)
- [ ] Category-based filtering
- [ ] Rating/review system
- [ ] Favorites/bookmarking

**Week 7-8: UI Polish**
- [ ] POI detail cards
- [ ] Map cluster behavior
- [ ] Mobile responsiveness
- [ ] PWA manifest setup

**Deliverable:** Users can pan map, find restaurants/attractions, save favorites.

---

### PHASE 3: Events & Editorial (Weeks 9-12)
**Goal:** Events + articles live

**Week 9-10: Event Crawler**
- [ ] Mobilizon federation integration
- [ ] Wikidata event API setup
- [ ] Daily crawler jobs (Celery)
- [ ] Event deduplication logic
- [ ] Event staleness detection

**Week 10-11: Editorial CMS**
- [ ] Strapi setup + customization
- [ ] Article content type creation
- [ ] Media library integration
- [ ] Publishing workflow
- [ ] Article display on frontend

**Week 11-12: Event UI**
- [ ] Event calendar view
- [ ] Event detail cards
- [ ] Event filtering (date, category)
- [ ] Event favoriting

**Deliverable:** Events and articles published, searchable on platform.

---

### PHASE 4: Quality & Compliance (Weeks 13-16)
**Goal:** Production-ready, GDPR/licensing compliant

**Week 13-14: Deduplication & Quality**
- [ ] Fuzzy matching dedup engine
- [ ] Automated data freshness monitoring
- [ ] Stale event detection/removal
- [ ] Moderation workflow UI
- [ ] Flag system (report bad data)

**Week 14-15: GDPR Implementation**
- [ ] User data export endpoint
- [ ] Erasure request workflow
- [ ] Consent management
- [ ] Audit logging (comprehensive)
- [ ] Privacy policy & DPA templates

**Week 15-16: Security & Compliance**
- [ ] External penetration testing
- [ ] Attribution system verification
- [ ] License compliance audit
- [ ] Dependency vulnerability scanning
- [ ] Disaster recovery plan

**Deliverable:** Platform ready for public beta launch.

---

### PHASE 5: Monetization (Weeks 17-20)
**Goal:** Business model & soft launch

**Week 17-18: Business Accounts**
- [ ] Business account signup flow
- [ ] Stripe payment integration
- [ ] Subscription tier system
- [ ] Business dashboard analytics

**Week 18-19: Sponsored Listings**
- [ ] Sponsored listing creation UI
- [ ] Impression/click tracking
- [ ] Payment reconciliation
- [ ] Featured POI display on map

**Week 19-20: Soft Launch**
- [ ] Beta user recruitment
- [ ] Initial business partnerships
- [ ] Feature stability & monitoring
- [ ] Performance optimization

**Deliverable:** Soft launch with paying customers (beta businesses).

---

## Team Structure (4-5 Engineers)

| Role | FTE | Responsibilities |
|------|-----|---|
| **Backend Lead** | 1.0 | NestJS architecture, PostGIS optimization, API design |
| **Frontend Lead** | 1.0 | Angular app, Leaflet map integration, UI/UX |
| **Data/DevOps** | 1.0 | Database setup, crawlers, deployment, monitoring |
| **Full-Stack** | 1.0 | Feature development across frontend/backend |
| **Part-time QA** | 0.5 | Testing, compliance verification (optional) |

---

## Budget Estimate

**Development (20 weeks):**
- Senior engineers: €120/hour × 40 hrs/wk × 20 wks × 2.5 FTE = €120K
- Subtotal: €120K

**Infrastructure & Services:**
- Compute (Docker host): €50/month = €300 (setup phase)
- Domain + SSL: €50/year
- External audit (security): €5K
- Legal review (licensing): €3K
- Subtotal: €8.3K

**Total Development:** **€128K-€135K**

**Ongoing Operations (Year 1):**
- Server compute: €50-100/month
- Database backup: €20/month
- Monitoring & logging: €50/month
- Domain renewal: €5/month
- Maintenance (1 engineer, 50%): €60K/year
- Total: **€76-80K/year**

---

## Success Metrics

### MVP (Week 12)
- ✅ Map displays 50k+ POIs (restaurants, attractions)
- ✅ 1000+ events visible
- ✅ 100 articles published
- ✅ GDPR compliance verified
- ✅ Zero licensing violations

### Beta (Week 16)
- ✅ 10k daily active users
- ✅ < 2 second page load time
- ✅ 99% uptime
- ✅ Zero data quality issues (dedup verified)
- ✅ Security audit passed

### Launch (Week 20)
- ✅ 50k monthly users
- ✅ 10 paying business customers
- ✅ €5K/month revenue (gross)
- ✅ NPS > 50

