# License & Compliance Analysis

## Executive Legal Summary

**RECOMMENDATION:** Use only MIT/BSD-2-Clause licensed stack to eliminate legal ambiguity.

**BLOCKING ISSUE:** AGPL v3 licenses (TREK, Mobilizon) are **NOT COMPATIBLE** with proprietary commercial platform. Network copyleft clause demands open-sourcing entire codebase.

**GPL v2 ISSUE (PostGIS):** Manageable IF architecture maintains PostGIS as external unmodified database service. Requires legal opinion on "linking vs. aggregation" interpretation.

**MSCL ISSUE (Directus):** Commercial licensing requirement for organizations >$5M revenue eliminates advantage over Strapi MIT alternative.

---

## 1. AGPL v3 License: Network Copyleft Risk

### License Terms (Section 13 - Network Interaction)
The AGPL v3 Network Interaction clause states:

> "If you convey [the program] in a form designed to require or permit, at the time a user of the computer network uses it, that the person using the computer to access it will have already received a copy... or been offered such a copy..."

### What This Means

**Trigger Event:** Users access TREK or Mobilizon features through your web platform over a network

**Obligation:** You must offer source code download to all users (at minimal/no cost)

**Scope:** Applies to entire platform if TREK/Mobilizon is "integrated" (definition contested in court)

### Legal Interpretations

**Interpretation A (Restrictive):** "Integration" means any code sharing, data flow, or shared database. Entire codebase must be AGPL.

**Interpretation B (Permissive):** "Integration" means functional dependency only. If TREK runs as completely separate service via API, only TREK portion must be AGPL.

**Current Case Law:**
- **Red Hat vs. Artifex (pending):** Will clarify copyleft scope
- **Most courts lean toward:** Interpretations A (restrictive)

### For Momap Platform

**Scenario A: Direct Integration (TREK code merged into platform)**
- ❌ **ILLEGAL for proprietary commercial platform**
- Must open-source entire codebase under AGPL
- No exception for "commercial wrapper"

**Scenario B: API Integration (TREK runs separately)**
- ⚠️ **LEGALLY UNCERTAIN**
- Depends on integration depth and jurisdiction
- Highest legal risk: platform authenticates TREK users, shows TREK data in UI

**Scenario C: Federated Integration (Mobilizon ActivityPub)**
- ⚠️ **LEGALLY UNCERTAIN**
- If you query Mobilizon federation but don't modify code: might be compliant
- If you proxy Mobilizon events: integration risk

### Compliance Paths

1. ✅ **Build custom event management (in-house)** — Eliminates AGPL dependency
2. ✅ **Obtain commercial license** — Contact TREK/Mobilizon maintainers for exception (cost unknown, likely >€5K/year)
3. ✅ **Open-source entire platform** — Unlikely for commercial venture
4. ❌ **Use as separate service** — **Risky**, legal uncertainty remains

### Recommendation
❌ **DO NOT USE TREK or Mobilizon** in momap without written commercial license from maintainers. Risk > benefit for bootstrapped startup. Build custom event management instead (estimated 2-3 weeks development).

---

## 2. GPL v2 License: PostGIS Embedding Risk

### License Terms
GPL v2 distinguishes between:
- **"Linking"** — Functional dependency (triggers GPL obligations)
- **"Mere aggregation"** — Using separate program via API (no GPL obligation)

### What This Means

**Scenario A: PostGIS as External Database Service**
- Your NestJS app calls PostGIS queries over TCP socket
- PostGIS binary runs in separate Docker container
- PostGIS code NOT embedded in your application binary
- **Assessment:** Likely compliant as "mere aggregation"

**Scenario B: PostGIS Code Linked into Binary**
- You include PostGIS C libraries in your application build
- Proprietary code depends on PostGIS internal APIs
- **Assessment:** Derivative work, triggers GPL v2 obligations

**Scenario C: Modified PostGIS**
- You fork and modify PostGIS
- You distribute modified version
- **Assessment:** DEFINITELY triggers GPL v2 copyleft

### Legal Uncertainty

**The "Linking" Question:**
- How deep can SQL integration go before it constitutes "linking"?
- Is a microservices architecture via HTTP different from local API?
- Jurisdiction interpretation varies (US courts less strict than EU)

### Compliance Paths

1. ✅ **Unmodified external database** (RECOMMENDED)
   - Run PostGIS in separate container
   - Access via standard SQL (psql client)
   - Treat as third-party database service
   - **Likely GPL-compliant**

2. ⚠️ **Legal opinion required**
   - Architect design for legal counsel review
   - Cost: €1-3K for qualified opinion
   - **Must do before production commitment**

3. ❌ **Avoid modifying PostGIS**
   - If you need spatial features beyond PostGIS, implement in NestJS layer
   - Do not fork/patch PostGIS itself

4. ❌ **Avoid direct C linking**
   - Use PostGIS only via SQL/libpq client
   - Never embed PostGIS libraries

### Recommendation
✅ **USE PostGIS as external database service.** Obtain legal opinion on GPL v2 "linking vs. aggregation" interpretation for your specific deployment model (Docker container architecture, SQL-only access, no modifications). Cost: €1-3K, worth the certainty.

---

## 3. MPL 2.0 License: File-Level Copyleft (Tokoro)

### License Terms
MPL 2.0 is file-level copyleft:
- Only modified files must be open-sourced
- Unmodified proprietary code coexists legally
- No derivative work infection

### What This Means

**You use Tokoro unmodified:**
- ✅ **Fully compliant**, no disclosure required
- Can integrate into proprietary platform
- No license restrictions on your code

**You modify Tokoro:**
- Must open-source only the modified files
- Provide explicit change notice
- Include patent grants for modified code

**You create derivative works from Tokoro:**
- Must include MPL 2.0 license notices
- Modifications must remain MPL 2.0
- Non-modified proprietary code remains proprietary

### For Momap Platform

**If using Tokoro event extraction as-is:**
- ✅ **Compliant**
- No restrictions on proprietary platform
- Only requirement: include Tokoro license in attribution

**If modifying Tokoro event extraction:**
- Must document modifications
- Must open-source modified Tokoro files
- Proprietary platform remains proprietary

### Recommendation
✅ **IF you use Tokoro, MPL 2.0 is manageable.** Recommend using Tokoro event extraction patterns without code reuse (study, then build custom). If you do reuse Tokoro code, use unmodified (don't fork) to simplify licensing.

---

## 4. MIT & BSD-2-Clause Licenses: Fully Permissive

### License Terms
- ✅ Commercial use allowed
- ✅ Proprietary derivative works allowed
- ✅ Modification allowed
- Only requirement: Retain copyright notice

### Applies To
- Strapi (MIT)
- Leaflet (BSD-2-Clause)
- TRIP (MIT)
- Angular (MIT)
- TypeScript (MIT)
- NestJS (MIT)

### For Momap Platform

**✅ FULLY COMPLIANT:**
- Build proprietary platform using MIT/BSD components
- No open-source obligations
- Only requirement: copyright notices in dependencies list

### Recommendation
✅ **Use MIT/BSD-2-Clause stack as foundation.** No legal ambiguity.

---

## 5. ODbL 1.0 License (OpenStreetMap Data)

### License Terms
**For map data, not software:**
- ✅ Commercial use allowed
- ✅ Modification allowed
- ⚠️ Share-alike: If you publish modified data, must use ODbL
- ✅ Attribution required (but specific format flexible)

### What This Means

**Using OSM base map:**
- Must display "© OpenStreetMap contributors" on map
- Link to https://www.openstreetmap.org/copyright acceptable
- Can show attribution in corner, info box, or footer
- Format flexible, placement flexible

**Using OSM POI data (restaurants, attractions):**
- Same attribution requirements
- If you modify/augment OSM data and publish: must share-alike

**Combining OSM with other data:**
- Share-alike applies only to geographic data layer
- Proprietary code remains proprietary
- Attribution must distinguish sources

### For Momap Platform

**✅ COMPLIANT:**
- Use OSM for base map layer
- Display attribution (required)
- Use self-hosted TileServer GL (avoids dependence on public OSM servers)
- Attribute data sources (OSM, Wikidata, kulturinfo) separately

### Recommendation
✅ **USE OpenStreetMap.** Ensure attribution display is implemented and tested before launch. Non-compliance is automatic license violation.

---

## 6. CC0 & CC-BY Licenses (Wikidata, kulturinfo)

### License Terms

**CC0 (Creative Commons Zero):**
- ✅ No restrictions, public domain
- No attribution required (though appreciated)
- Full commercial use allowed

**CC-BY (Creative Commons Attribution):**
- ✅ Commercial use allowed
- ⚠️ Attribution required (can be simple text)
- Must specify which work requires which attribution

### For Momap Platform

**✅ COMPLIANT:**
- Use Wikidata freely without restrictions
- Use kulturinfo data with attribution
- Display attribution near content (e.g., "Based on kulturinfo.hu, licensed CC-BY")

### Recommendation
✅ **USE Wikidata & kulturinfo.** Implement data source tracking system (database column: source_url, source_license, attribution_required) so you can auto-generate attribution display.

---

## 7. Directus MSCL License: Commercial Revenue Threshold

### License Terms
- ✅ Free for organizations <$5M annual revenue
- ✅ Can self-host for free if under threshold
- ⚠️ Organizations >$5M revenue must purchase commercial license
- "Monetary gains" broadly defined (includes indirect revenue)

### What This Means

**Under $5M revenue:**
- ✅ Fully free to use, including self-hosted
- Can monetize platform without license cost
- No restrictions

**Over $5M revenue:**
- ❌ Must purchase commercial license
- Cost: €5-15K/year (varies by deployment scale)
- License retroactively required if threshold crossed

**Ambiguities:**
- "Organization" includes parent companies, affiliates
- "Monetary gains" can include cost savings, not just direct revenue
- No clear threshold for SaaS multi-tenant deployment

### For Momap Platform

**If bootstrapped startup (under $5M):**
- ✅ Directus self-hosted is free
- But: What happens if successful and cross $5M?
- Retroactive licensing requirement risky

**If growth is goal:**
- ⚠️ Risky to adopt Directus
- Better to use Strapi (MIT) from day one
- Eliminates licensing ambiguity

### Recommendation
❌ **AVOID Directus for self-hosted.** Use Strapi (MIT community edition) instead. Strapi eliminates revenue-threshold licensing uncertainty. If later you want database abstraction, use TypeORM directly instead of Directus wrapper.

---

## 8. Compliance Checklist Before Launch

### LEGAL REQUIREMENTS

- [ ] **Licensing review:** Stakeholders confirm recommended MIT/BSD stack acceptable
- [ ] **AGPL rejection:** Confirm TREK/Mobilizon network copyleft unacceptable; approve custom event management instead
- [ ] **PostGIS interpretation:** Obtain legal counsel opinion on GPL v2 "linking vs. aggregation" for your deployment model
- [ ] **Terms of Service:** Draft ToS including:
  - Data sources and attributions (OSM, Wikidata, kulturinfo)
  - User data practices (GDPR)
  - Limitation of liability for third-party content
  - Dispute resolution jurisdiction
- [ ] **Privacy Policy:** Document location data handling, GDPR rights, retention policies
- [ ] **Data Processing Agreement (DPA):** For each external data source, formalize terms
- [ ] **Copyright/IP:** Clarify ownership of user-submitted content, business entities, sponsored listings

### IMPLEMENTATION REQUIREMENTS

- [ ] **Attribution system:** Database field for source_url, source_license, attribution_required
- [ ] **Attribution display:** Tested on map, in POI details, in content footer
- [ ] **License compliance report:** Auto-generated report listing all dependencies, licenses, compliance status
- [ ] **GDPR implementation:** User export, erasure, data access endpoints
- [ ] **Audit logging:** All data access and modifications logged with timestamp/user/action
- [ ] **Change notices:** If modifying any open-source code, document changes and maintain source availability

### PRE-LAUNCH APPROVALS

- [ ] **Legal counsel:** Final review of ToS, privacy policy, compliance approach (cost: €2-5K)
- [ ] **DPO (if required):** GDPR compliance verification
- [ ] **Security audit:** External penetration testing (cost: €3-8K)
- [ ] **CEO/founder:** Approval of licensing model and compliance costs

---

## Risk Matrix: License Compliance

| Risk | Severity | Likelihood | Mitigation | Status |
|------|----------|-----------|-----------|--------|
| AGPL copyleft (TREK/Mobilizon) | CRITICAL | HIGH | Don't use; build custom | ✅ DECIDED |
| GPL v2 linking (PostGIS) | HIGH | MEDIUM | Use external service; obtain legal opinion | ⚠️ PENDING |
| OSM attribution failure | HIGH | MEDIUM | Implement auto-attribution system; test before launch | ⚠️ TODO |
| GDPR erasure not implemented | CRITICAL | HIGH | Code template provided; implement in Week 12 | ⚠️ TODO |
| Directus commercial threshold | MEDIUM | LOW | Use Strapi instead | ✅ DECIDED |
| Dependency vulnerabilities | MEDIUM | MEDIUM | npm audit in CI/CD | ⚠️ TODO |

---

## Conclusion

**Recommended approach: Use MIT/BSD-2-Clause stack exclusively.**

This eliminates legal ambiguity around copyleft licenses while maintaining excellent technology choices:

- ✅ Strapi (MIT) for editorial CMS
- ✅ Leaflet (BSD-2) for mapping
- ✅ Angular (MIT) for frontend
- ✅ NestJS (MIT) for backend
- ✅ PostGIS (GPL v2 external service) with legal review
- ✅ OpenStreetMap (ODbL) with attribution system
- ✅ Wikidata (CC0) with optional attribution

**Legal investment required:** €3-5K for licensing opinion + €2-5K for pre-launch legal review + €3-8K for security audit = ~€8-18K total.

**No licensing costs:** €0/month (all software free, all data sources free).

