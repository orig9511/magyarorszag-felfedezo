# CMS & Monetization

**Status:** Audit draft, revised 2026-10-11 by a verification pass. The CMS choice is **still open**. §3 is a **PROPOSAL** for the user to decide.
**Evidence tags:** VERIFIED / INFERRED / UNVERIFIED / BLOCKED (see `01`). **Sources:** `_sources-licensing.md`.
**Approved constraints (2026-10-11):** solo developer. EUR 20–50/month EU VPS with Docker Compose. Proprietary code. Hungarian-first content with i18n from day one, English second. No billing or business portal in the MVP, only data-model hooks (ownership/claim field, `sponsored` label).

> **Security and operations** (auth, admin audit trail, rate limiting, secrets, GDPR, backups) moved to [`06-security-and-operations.md`](06-security-and-operations.md). The security section that used to open this file has been removed.

---

## 1. What the CMS is for

**INFERRED** from `03` and the product vision:

- **In the CMS:** editorial content. That means articles, seasonal guides, curated recommendation lists, homepage blocks, static pages, authors, tags, and media, all in HU and EN.
- **Not in the CMS:** POIs, events, settlements, county boundaries, ingestion state, and moderation queues. These live in the NestJS + PostGIS domain model, where spatial indexing and viewport queries happen (see `03`, `04`, `05`).
- **Links between the two:** editorial items reference domain entities by ID or slug (for example, a guide that features 5 POIs in Hajdú-Bihar). They may also carry a simple geo hint (county, point) for placement on the map.

So the CMS needs good i18n, media handling, draft/publish, and an edit history. Rich spatial features are a nice-to-have, not a core requirement.

## 2. Strapi vs Directus (verified facts)

| Criterion | Strapi 5.57.0 (Community) | Directus 12.5.0 | Tag |
|---|---|---|---|
| License | MIT core. `ee/` dirs plus the whole `review-workflows` and `content-releases` packages are Enterprise-licensed and ship in a default install. MIT condition: "no registered account on our cloud offering" | MSCL-1.0 (source-available). Any use except "Competing Use". Becomes GPL-3.0 after 4 years | VERIFIED |
| Cost for us | EUR 0 (Community) | EUR 0 via the Open Innovation Grant (<$5M revenue and <50 employees, yearly key, 5 activations), or free Core tier (3 seats, 25 collections, 5 flows) without a key | VERIFIED (pricing, docs) / INFERRED (eligibility) |
| Admin audit trail | **Audit Logs are Enterprise only.** Content History needs Growth ($45/mo, 14-day retention) | Activity log (`directus_activity`) and revisions (`directus_revisions`) in the free product. Not in the entitlement list | VERIFIED (pricing, `ee/` source, Directus source) |
| Review / approval workflow | Review Workflows: Enterprise. Releases: Growth | Can be modelled with a status field, permissions, and Flows (Core: 5 flows) | VERIFIED (pricing) / INFERRED (Directus approach) |
| i18n (HU + EN content) | In Strapi 5 core, free. Per-locale entries | `translations` field type (junction to a languages collection) | VERIFIED (Strapi docs) / VERIFIED that the field type exists in source, UI not tested |
| Geo fields | No native geometry type found. Use JSON or a custom field | Native geometry types (Point…MultiPolygon) with PostGIS detection and a map interface | VERIFIED (source) |
| Minimum / recommended resources | 1 core, 2 GB RAM / 2 cores, 4 GB (docs). The admin panel must be built (`strapi build`) | 0.25 vCPU, 512 MB / 1 vCPU, 2 GB (docs). Prebuilt Docker image | VERIFIED (docs) |
| Runtime | Node 20–26 (npm `engines`). PostgreSQL 14+ | Node >=22 (`@directus/api`). Docker image | VERIFIED |
| Data model ownership | Strapi owns its own tables. Schema is defined in code (content-type JSON in the repo) | Mirrors an SQL database. Schema can be snapshotted and applied (`schema apply` CLI exists) | VERIFIED (Directus CLI source path) / INFERRED |
| Vendor/license stability | MIT core has been stable. EE scope has grown into separate packages | Relicensed twice (BSL 2023, MSCL 2026). Grant terms can change | VERIFIED (license history) / INFERRED (trend) |
| Admin UI in Hungarian | Not checked | Not checked (`crowdin.yml` present) | UNVERIFIED |

> Corrections from the previous draft: Strapi "review workflows and release scheduling" are **not** Community/MIT features. "Revision history and rollback" is Growth/Enterprise (Content History), not free. The sample `docker-compose` (`node:18-alpine`, `npm run develop`) has been removed: Node 18 is outside Strapi 5's supported range, and `develop` is dev mode, not for production. Directus's licence was misdescribed (see `02` §6).

### Footprint on the target VPS (INFERRED)

The budget allows something like a 4–8 GB RAM EU VPS (provider pricing is in `06`/`08`, not rechecked here). Both CMSs fit next to PostgreSQL/PostGIS, NestJS, and a reverse proxy:
- **Directus** is lighter at runtime and needs no build step on the server: you pull the image and run it.
- **Strapi** needs about 2 GB for the app, plus more to build the admin panel. Build it in CI (or locally) into an image, not on the VPS.
- Neither needs Redis for a single instance (VERIFIED for Directus; INFERRED for Strapi).

## 3. Recommendation (PROPOSAL, not a decision)

**Proposed: Directus 12.x, self-hosted, under the Open Innovation Grant, scoped to editorial content.** **INFERRED.**

Why, for a solo developer:
1. **Admin audit trail without paying or building one.** `06` treats an admin audit trail as a requirement. Directus's activity and revision logs cover CMS edits in the free product. With Strapi Community you would have to build it yourself (lifecycle hooks, or the NestJS `audit_event` table), because Audit Logs are Enterprise only. Note that NestJS moderation actions need their own `audit_event` table either way (`06`).
2. **Geo-aware content.** Native PostGIS-backed geometry fields let editorial items carry a point or area, for example "guide for Hortobágy", without custom plugins.
3. **Lower ops burden.** Prebuilt image, 512 MB minimum, no admin build step. That fits a EUR 20–50 VPS and one person's time.
4. **i18n** is supported natively through translations, which covers HU-first plus EN.

Conditions and risks the user must accept:
- **Not open source.** MSCL is source-available. Our use (our own back office) is not a Competing Use (INFERRED), but it depends on a vendor that has relicensed twice.
- **Grant administration.** Apply for a key, renew yearly, and track the renewal date. The key binds to `PUBLIC_URL` and uses 5 activations. Revalidation probably needs outbound network access (UNVERIFIED).
- **Fallback if the grant lapses:** the Core tier allows **3 seats, 25 collections, 5 flows**. Design the editorial model to stay under 25 collections, remembering that each translated collection adds a `*_translations` junction collection (INFERRED: whether junctions count toward the cap is UNVERIFIED). A rough count: about 6 content types × 2 plus languages is roughly 15 collections.
- **Pin versions** and re-read the license on every major upgrade.
- **Separate database** (or at least a separate PostgreSQL database on the same server) from the NestJS/PostGIS domain DB. This avoids coupling migrations. (INFERRED.) Pointing Directus at the domain DB as a ready-made POI moderation UI is tempting for a solo developer, but it collides with the 25-collection Core cap and with schema ownership. Evaluate it later in a prototype. **UNVERIFIED.**

**Fallback proposal: Strapi 5 Community** if the user wants an OSI (MIT) license and no vendor key. Accept that you will build the CMS edit audit trail yourself (or rely on the NestJS audit table plus DB backups), skip review workflows (use draft/publish; whether that is free in Community is **UNVERIFIED** in this pass), store geo hints as JSON or as references to NestJS POIs, and do not enable any EE feature. Note the "no Strapi Cloud account" condition in its MIT grant (`02` §5).

**Before deciding:** do a half-day spike for each CMS on the target VPS size. Model 3 content types in HU and EN, check memory use, check the edit history, and check the admin UI in Hungarian. **UNVERIFIED** until done.

## 4. Monetization: MVP hooks only (APPROVED scope)

There is no billing, no business portal, and no payment provider in the MVP (**APPROVED**). Reserve only these hooks in the domain model (NestJS/PostGIS, not the CMS). **INFERRED:**

| Field (on POI / event / editorial item) | Purpose |
|---|---|
| `owner_account_id` (nullable), `claim_status` (`unclaimed` / `pending` / `verified`) | Future business claim of a listing |
| `is_sponsored` (bool), `sponsor_name`, `sponsored_from`, `sponsored_until` | Future sponsored placement. The UI **must** show a visible "Szponzorált / Sponsored" label whenever `is_sponsored` is true |
| `promotion_area` (geometry, nullable) | Future geographically targeted campaigns (fits PostGIS) |

Rules for the design, **INFERRED** (legal basis **UNVERIFIED**):
- Sponsored items are always labelled. Labelling must not depend on CMS editors remembering to add it.
- Ranking or ordering must not quietly mix sponsored and organic results without the label. EU consumer and platform rules on advertising disclosure (for example UCPD, and possibly DSA ad-transparency duties) need checking in the legal review.
- No tracking-based ad targeting in the MVP. Any later impression/click analytics should be aggregate and consent-aware (see `06`).

### Later phases (not scoped, all UNVERIFIED)

Business accounts (claim a listing, edit details, add photos), paid promoted listings or events, and county/area-targeted campaigns. Choose a payment provider, invoicing (Hungarian e-invoicing / NAV online invoice reporting), and pricing at that time.
The previous draft's prices (EUR 0.10–2.00 per interaction, EUR 9/29 tiers), its "EUR 5–20K/month" revenue estimate, and its Stripe code sample had no evidence behind them. They have been **removed**.

---

## Verification log (2026-10-11)

- **Done:** Removed the misplaced security section (now in `06`). Verified the Strapi license structure (root `LICENSE` at v5.57.0, package-level Enterprise licenses for review-workflows and content-releases, `ee/` audit logs and SSO, `@strapi/strapi` dependencies). Verified Strapi pricing tiers (Audit Logs and Review Workflows are Enterprise only) and hardware requirements. Verified Directus's MSCL text, grant terms, Core limits, entitlement code, geometry helpers, activity/revision services, and hardware requirements. Reframed monetization to the approved MVP hooks.
- **Revisions:** Strapi `5ca3fb208a88` / tag v5.57.0. Directus `8e140f942508` / tag v12.5.0.
- **Corrections:** Strapi feature/licence claims. Removed the invalid Strapi compose sample. Removed the unsupported pricing, revenue, and Stripe material. The CMS recommendation changed from "Strapi (decided)" to a **proposal** for Directus with a Strapi fallback.
- **UNVERIFIED:** Hungarian admin UI for both. Strapi Community draft/publish scope. Whether Directus junction collections count toward the 25-collection cap. Directus key revalidation network needs. The Directus grant usage agreement. Real memory use on the VPS (no spike run). Advertising-disclosure law.
- **BLOCKED:** none in this file.
