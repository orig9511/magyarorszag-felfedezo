# Open Questions & Decisions Requiring Approval

## Product Strategy Decisions

### 1. Geographic Rollout Approach
**Options:**
- A. Budapest & Debrecen only (MVP) → expand to other counties post-launch
- B. All 19 counties from day one

**Impact:** Option A reduces initial data ingestion work (2 weeks saved), but Option B maximizes initial market coverage.

**Recommendation:** Start with Option A (Budapest + Debrecen), expand to other cities post-MVP.

**Decision Required:** ☐ Confirm rollout approach

---

### 2. Multi-Language Support at Launch
**Options:**
- A. Hungarian only (MVP) → Add English later
- B. Hungarian + English from launch

**Impact:** Option B adds 1-2 weeks to frontend/CMS work, but improves international appeal.

**Recommendation:** Implement Hungarian + English from start (Strapi i18n built-in).

**Decision Required:** ☐ Confirm language scope

---

### 3. Payment Processing at Launch
**Options:**
- A. Soft launch without monetization (Week 20) → Add payments Phase 2
- B. Include Stripe integration from day one

**Impact:** Option B delays launch 2-3 weeks, but enables immediate revenue.

**Recommendation:** Defer payments to Phase 2; focus on user growth first.

**Decision Required:** ☐ Confirm monetization timeline

---

### 4. Offline Mode Support
**Options:**
- A. Online-only (MVP) → Add offline support later
- B. PWA offline support from launch

**Impact:** Option A saves 1-2 weeks. Option B improves rural/mobile usability.

**Recommendation:** Implement PWA offline for maps (Leaflet cache), defer POI offline sync to Phase 2.

**Decision Required:** ☐ Confirm offline requirements

---

## Technical Decisions Requiring Legal/Architectural Review

### 5. PostGIS GPL v2 Compliance Model
**Critical:** Architecture must be reviewed for GPL v2 "linking vs. aggregation" interpretation.

**Current Plan:** PostGIS as external database service (not embedded).

**Required:** Obtain legal counsel opinion before final architecture commit.

**Cost:** €1-3K  
**Timeline:** Week 1-2

**Decision Required:** ☐ Approve legal review budget

---

### 6. AGPL v3 Rejection Confirmation
**Decision:** Do NOT use TREK or Mobilizon due to AGPL v3 network copyleft.

**Alternative:** Build custom event management in-house.

**Impact:** +2-3 weeks development vs. attempting Mobilizon integration.

**Decision Required:** ☐ Confirm rejection of TREK/Mobilizon

---

### 7. Directus CMS Decision
**Decision:** Use Strapi (MIT) instead of Directus (MSCL) to avoid revenue threshold licensing.

**Rationale:** Strapi MIT is simpler and eliminates licensing ambiguity at scale.

**Decision Required:** ☐ Confirm Strapi choice

---

## Data Partnership Opportunities

### 8. Hungarian Tourism Board Data Agreement
**Opportunity:** Potential partnership with Hungarian Tourism Board for official event/venue data.

**Status:** Not yet contacted.

**Timeline:** Begin discussions in Week 5 (parallel to MVP development).

**Potential Value:** Official data stamp, reduced reliance on automated crawling.

**Decision Required:** ☐ Approve outreach to tourism boards

---

### 9. Jegy.hu Ticketing Platform Integration
**Opportunity:** Largest Hungarian ticketing platform (50k+ events/year).

**Status:** Not yet contacted.

**Challenge:** Likely requires revenue share or partnership agreement.

**Timeline:** Post-launch discussions (Phase 2).

**Decision Required:** ☐ Approve future partnership exploration

---

## Risk Decisions Requiring Stakeholder Approval

### 10. Security Audit Budget
**Recommendation:** €3-8K external penetration testing (Week 15-16).

**Scope:** SQL injection, XSS, authentication flow, GDPR compliance.

**Decision Required:** ☐ Approve security audit budget

---

### 11. Legal Review Budget
**Recommendation:** €3-5K total:
- €1-3K: PostGIS GPL v2 interpretation
- €2-3K: Pre-launch licensing compliance + ToS review

**Decision Required:** ☐ Approve legal review budget

---

### 12. Database Backup Strategy
**Decision:** PostgreSQL automated daily backups + weekly disaster recovery tests.

**Cost:** €20-50/month (managed backup service).

**RTO Target:** 4 hours (acceptable for tourism platform)  
**RPO Target:** 24 hours (data from most recent backup)

**Decision Required:** ☐ Approve backup retention policy

---

## Unresolved Technical Questions

### 13. Search Solution: PostgreSQL Full-Text vs. Elasticsearch?
**PostgreSQL Full-Text:**
- ✅ Included in database
- ✅ Simple implementation (no separate service)
- ⚠️ May be slow for 100k+ records

**Elasticsearch:**
- ✅ Powerful search (facets, rankings)
- ✅ Scalable to millions of records
- ⚠️ Separate service (+€30/month, +complexity)

**Recommendation:** Start with PostgreSQL full-text (Week 8), migrate to Elasticsearch if performance degradation detected.

**Decision Required:** ☐ Confirm search architecture

---

### 14. Caching Strategy: Redis vs. Application Cache?
**Current Plan:** Redis + application-level caching.

**Trade-off:** Redis adds complexity (+€20/month, +setup time), but essential for < 100ms viewport queries.

**Decision Required:** ☐ Approve Redis in stack

---

### 15. Analytics & Tracking: How Much User Tracking Is Acceptable?
**Current Plan (GDPR-compliant):**
- ✅ Aggregate POI view counts (no user attached)
- ✅ Search terms (aggregate only)
- ⚠️ User location tracking (requires explicit consent)

**Question:** Should we track user behavior for analytics (with consent), or focus on aggregate metrics only?

**Decision Required:** ☐ Confirm analytics scope / consent model

---

## Timeline Dependencies

| Week | Dependency | Decision Needed | Risk Level |
|------|-----------|---|---|
| Week 1-2 | PostGIS legal review | Approve legal counsel budget | CRITICAL |
| Week 1 | AGPL rejection | Confirm build-in-house event mgmt | HIGH |
| Week 5-6 | Search solution | Elasticsearch vs. PostgreSQL | MEDIUM |
| Week 9 | Data partnerships | Approve tourism board outreach | MEDIUM |
| Week 15 | Security audit | Approve €3-8K audit budget | CRITICAL |

---

## Summary: What Needs Stakeholder Approval

**CRITICAL (blocks launch):**
1. ☐ PostGIS GPL v2 legal opinion (€1-3K)
2. ☐ AGPL rejection / build-in-house decision
3. ☐ Security audit (€3-8K, Week 15-16)
4. ☐ Pre-launch legal review (€2-3K)

**IMPORTANT (affects timeline):**
5. ☐ Strapi CMS choice (impacts budget: -€5K vs. Directus licensing)
6. ☐ Search architecture (Redis + Elasticsearch decision)
7. ☐ Geographic rollout scope (Budapest-only or nationwide)

**NICE-TO-HAVE (can defer):**
8. ☐ Offline mode scope
9. ☐ Payment processing timeline
10. ☐ Analytics tracking depth

---

## Approval Checklist

**Before Phase 1 (Week 1):**
- [ ] CEO: Approve €128-135K development budget
- [ ] CTO: Approve technology stack + architecture
- [ ] Legal: Approve PostGIS legal review
- [ ] Product: Confirm geographic rollout (Budapest + Debrecen)

**Before Phase 3 (Week 9):**
- [ ] Product: Confirm event data sources
- [ ] Marketing: Approve data partnership outreach strategy

**Before Phase 4 (Week 13):**
- [ ] CEO: Approve security audit budget (€3-8K)
- [ ] Legal: Confirm GDPR compliance approach

**Before Launch (Week 20):**
- [ ] Legal: Final ToS + privacy policy review
- [ ] Security: Audit results sign-off
- [ ] Product: Feature completeness verification

