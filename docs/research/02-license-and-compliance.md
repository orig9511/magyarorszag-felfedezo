# License & Compliance Analysis

**Status:** Audit draft, revised 2026-10-11 by a verification pass. This is not legal advice. Points marked "legal review" should go to a qualified lawyer before launch.
**Evidence tags:** VERIFIED / INFERRED / UNVERIFIED / BLOCKED (see `01`). **Sources:** `_sources-licensing.md`.
**Approved constraints (2026-10-11):** proprietary closed-source platform. TREK, TRIP, Mobilizon, and Tokoro are reference-only (no code copying, not run as services). The only third-party runtime dependencies are Leaflet, PostGIS, and one CMS. Solo developer, small EU VPS.

## Executive summary

| Topic | Revised position | Tag |
|---|---|---|
| AGPL (TREK, Mobilizon) | Not a blocker any more: neither code nor services are used (**APPROVED** reference-only policy). Main residual risk is copying code by mistake | INFERRED |
| MPL-2.0 (Tokoro) | Same. No files, prompts, or snippets copied | INFERRED |
| MIT (TRIP) | Reuse would be allowed with a notice, but the policy is reference-only | VERIFIED (license) / APPROVED (policy) |
| GPL-2.0+ (PostGIS) | Separate DB server, unmodified, accessed via SQL: very likely no obligations for the app. Legal review **advisable, not blocking** | INFERRED |
| BSD-2-Clause (Leaflet) | Keep the copyright notice in distributed JS bundles | VERIFIED (license) |
| Strapi | **MIT core plus Enterprise-licensed parts**, some of which ship in a default install. Needs care. See §5 | VERIFIED (license files) |
| Directus v12 | **MSCL-1.0**, source-available, not OSI. Our use is not a "Competing Use". Free full access via the Innovation Grant if under $5M revenue and 50 employees. Otherwise Core-tier limits apply. See §6 | VERIFIED (texts) / INFERRED (application) |
| OSM/ODbL, Wikidata, others | Handled in `04`/`05`. §7 is only a summary | partly UNVERIFIED |

> Corrections from the previous draft: (1) The text quoted as "AGPL Section 13" was not Section 13. It has been removed and not replaced with a paraphrase, because the clause no longer matters to the design. (2) The case-law claims ("Red Hat vs. Artifex (pending)", "most courts lean restrictive") had no source and have been removed. (3) The claim that PostGIS needs a legal opinion "before production commitment" is overstated (§2). (4) The claim that Directus's MSCL carries a "$5M" threshold is wrong: the threshold is in the separate grant (§6). (5) "Strapi = MIT" was incomplete (§5). (6) The unsourced legal and audit cost figures have been removed.

---

## 1. AGPL-3.0 (TREK, Mobilizon)

- **VERIFIED:** both repos ship the full AGPL-3.0 text (`LICENSE`, revisions in `01`).
- AGPL adds a network-use condition: if you *modify* AGPL software and let users interact with it over a network, you must offer those users the corresponding source (FSF GPL FAQ #UnreleasedModsAGPL). **VERIFIED** (FSF FAQ).
- Under the approved policy, no AGPL code is copied or run, so these obligations cannot arise. **INFERRED.**
- **Residual risk:** an AI agent or developer pasting snippets from these repos. **Mitigation:** keep clones out of the repo (already the practice) and note the reference-only rule in the contributor guide and agent instructions. **INFERRED.**
- TREK also has a trademark policy (`TRADEMARKS.md`). Do not use the "TREK" name or logo. **VERIFIED.**

## 2. GPL-2.0-or-later (PostGIS), re-assessed

**Facts:**
- PostGIS is licensed "under the conditions of the GNU General Public License, either version 2 or (at your option) any later version" (`LICENSE.TXT`). **VERIFIED.**
- The PostGIS project FAQ ("Will the GPL license used by PostGIS force me to release my source code?") says the GPL's share-alike clauses do not apply to ordinary use such as loading data and running queries. Applications may be under any license. Only *distributing a modified PostGIS* creates source obligations, and those cover PostGIS, not the applications on top. **VERIFIED** (official FAQ).
- FSF GPL FAQ #MereAggregation: "pipes, sockets and command-line arguments are communication mechanisms normally used between two separate programs". Modules in the same executable or shared address space are one program. The FAQ also says the line is ultimately a legal question. **VERIFIED.**
- FSF GPL FAQ #UnreleasedMods: running a (even modified) GPL program on a web site without distributing it requires no source release. AGPL is the exception. **VERIFIED.**
- FSF GPL FAQ #GPLInProprietarySystem: GPL software may be distributed alongside proprietary software when they communicate "at arms length". **VERIFIED.**

**Application to this project (INFERRED):**
- The planned architecture runs NestJS (proprietary) as a separate process. It connects to PostgreSQL+PostGIS over TCP using the PostgreSQL wire protocol and sends SQL text. There is no linking, no shared address space, and no PostGIS code in the app. This is the textbook "separate programs" case.
- The project runs PostGIS itself on its own VPS (SaaS). It does not *distribute* PostGIS, so even the PostGIS-side source obligation does not arise. If the project ever hands a Docker image containing PostGIS to a third party, the GPL obligations for *PostGIS* (provide source / written offer) apply. Using the upstream `postgis/postgis` image with a pointer to upstream sources would satisfy this simply.
- Using PostGIS SQL functions (`ST_Intersects`, etc.) in queries does not make the app a derivative work. This matches the PostGIS FAQ position.
- **Conclusion:** risk is low. Legal review is **advisable** as part of the general pre-launch review (alongside ToS and privacy), but it is **not a gating item** and does not need a dedicated opinion.

**Practical rules (INFERRED):** do not fork or patch PostGIS. Do not write C extensions that link PostGIS internals. Keep the PostgreSQL/PostGIS versions upstream.

## 3. MPL-2.0 (Tokoro)

- **VERIFIED:** `LICENSE` is MPL-2.0, and the `crawler` and `crawler-worker` manifests declare MPL-2.0.
- MPL-2.0 is file-level copyleft: if you distribute covered files (modified or not), they stay under MPL with source available, and your other files can be under any license. **INFERRED** from the license text (not reproduced here).
- Under the reference-only policy, no Tokoro file, prompt, or schema is copied. The earlier advice to "reference Tokoro's prompts" has been withdrawn. **INFERRED.**

## 4. Permissive licenses (MIT, BSD)

| Component | License | Tag |
|---|---|---|
| Leaflet | BSD-2-Clause | VERIFIED (`LICENSE` at v1.9.4) |
| leaflet.markercluster | MIT | VERIFIED (npm metadata) |
| TRIP (reference only) | MIT | VERIFIED |
| Angular, NestJS, TypeScript | MIT (widely documented) | UNVERIFIED in this pass |

The obligation is to keep copyright and license notices in distributed copies. For a web app, the JS bundles shipped to browsers count as distribution, so generate a third-party notices file at build time (for example with a license-report tool in CI). **INFERRED.**

## 5. Strapi: MIT core plus Enterprise parts

- **VERIFIED** (root `LICENSE`, identical at tag v5.57.0 and HEAD `5ca3fb20`):
  - Code under any `ee/` directory is under the Strapi Enterprise license (https://strapi.io/enterprise-terms) unless there is a signed agreement or a cloud subscription.
  - Everything else is MIT Expat **if** (a) you do not access or use `ee/` code **and** (b) "you have no registered account on our cloud offering". Condition (b) is unusual. **Legal review item:** what applies if the developer later registers a Strapi Cloud account?
- **VERIFIED:** `packages/core/review-workflows/LICENSE` and `packages/core/content-releases/LICENSE` put the **whole package** under the Enterprise License, and `@strapi/strapi` 5.57.0 depends on both. Audit logs, SSO, and seat enforcement live under `packages/core/admin/ee/`.
- **INFERRED:** a standard install therefore *ships* Enterprise-licensed code, and features are gated by a license key at runtime. The license wording turns on "accessing or using" that code. Using Community features without enabling EE features is very likely what Strapi intends to be free (its pricing page calls Community "free, forever"), but the text is not clean. **Legal review item (low priority).**
- **VERIFIED** (pricing page): Community does not include Releases, Review Workflows, Content History, Audit Logs, or SSO. Releases and Content History start at Growth ($45/mo, 3 seats). Review Workflows and Audit Logs are Enterprise only.
- **VERIFIED:** i18n is MIT and part of core.

## 6. Directus v12: MSCL-1.0 and the Innovation Grant

- **VERIFIED** (`license` at v12.5.0, identical at HEAD): Monospace Sustainable Core License 1.0 ("MSCL-1.0-GPL"). It grants use, modification, and redistribution for any "Permitted Purpose", meaning anything except a **Competing Use**: making the software available to others in competition with Monospace's paid offerings of the software itself. You must not circumvent license-key functionality. Each version becomes **GPL-3.0 four years** after release. It is source-available, not OSI open source.
- **VERIFIED:** the license text contains **no revenue threshold**. The $5M figure comes from the **Open Innovation Grant**: entities under $5M annual revenue **and** under 50 employees get free, full access through a license key. Eligibility is assessed on "legal entities whose representatives log into the Directus Studio". The key has 5 activations bound to `PUBLIC_URL`, is valid 1 year and renewable, has a 30-day grace period, and falls back to Core on expiry.
- **VERIFIED:** above the thresholds (or with no key), the **Core** tier is free and needs no key, but it is capped at 3 seats, 25 collections, and 5 flows, with no SSO. Custom permission rules are entitlement-gated in code (`api/src/license/entitlements/manager.ts`).
- **VERIFIED:** ≤ v11 used BSL 1.1 with a $5M "Total Finances" grant (revenue, budget, *or funding*, including affiliates). This is a different and broader test. It matters if an investor round is ever raised while on an old version.
- **Application (INFERRED):**
  - Running Directus as the internal editorial back office of our own tourism site is not a Competing Use, because we do not offer a CMS.
  - A solo developer's entity is far below both thresholds, so the grant should apply. Eligibility is reviewed periodically and the key must be renewed yearly. That is a small operational dependency on the vendor.
  - If the grant lapsed, Core limits (3 seats, 25 collections) would very likely still fit an editorial-only CMS. Collection count needs checking against the content model in `07`.
  - **Vendor risk:** the license has changed twice (BSL in 2023, MSCL in 2026). Future versions could change again. Already-released versions keep their license, and each converts to GPL-3.0 after 4 years.
- **UNVERIFIED:** the full grant usage agreement text (how revenue is counted, affiliates). Whether key revalidation needs outbound network access. The docs imply periodic revalidation but do not state it.

## 7. Data licenses (summary only; detail in `04` / `05`)

| Source | Position | Tag |
|---|---|---|
| OpenStreetMap data | ODbL 1.0: attribution "© OpenStreetMap contributors" with a link to /copyright. Share-alike applies to *derivative databases* that are publicly used. Rendered maps (Produced Works) need attribution only | UNVERIFIED in this pass (see `04`) |
| OSM tile servers | Tile-usage policy is separate from ODbL. The public tile.openstreetmap.org is not for production apps of this kind | UNVERIFIED in this pass (see `04`) |
| Wikidata | CC0 for structured data. Wikipedia text and Commons media have their own licenses (often CC BY-SA) | UNVERIFIED in this pass |
| kulturinfo.hu and other HU event sources | The earlier "CC-BY" claim was **not supported by any source**. Treat as unknown until checked (see `05`) | UNVERIFIED |
| geoBoundaries (seen in TREK) | CC BY 4.0 | VERIFIED (TREK `NOTICE.md`), primary source not checked |

**Correction:** the previous draft listed "Data Processing Agreements" with OSM, Wikidata, and kulturinfo. These are data *sources*, not GDPR processors, so DPAs do not apply to them. DPAs apply to processors such as the hosting provider (see `06`).

Implementation rule (unchanged, INFERRED): store `source`, `source_url`, `license`, `attribution_text`, and `retrieved_at` per imported record, and render attribution from those fields.

## 8. Pre-launch compliance checklist (solo scale)

- [ ] Reference-only rule written into contributor and agent instructions. Third-party clones stay outside the repo.
- [ ] Third-party notices file generated in CI for frontend bundles and backend images.
- [ ] Map attribution (OSM, tile provider) visible on every map view.
- [ ] Per-record source and license fields populated by every importer.
- [ ] CMS license position recorded: Strapi Community (no EE features enabled), or Directus with the grant key and renewal date tracked.
- [ ] One combined legal review before public launch: ToS, privacy notice, source terms for imported data, plus a brief check of the PostGIS, Strapi, or Directus conclusions above. Cost not estimated. **UNVERIFIED.**

## Risk matrix (revised)

| Risk | Severity | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| Accidental copy of AGPL/MPL code from reference repos | High | Low | Reference-only rule, clones outside the repo, review diffs | Policy APPROVED |
| GPL obligations from PostGIS | Low | Very low | Unmodified, separate server, SQL only, no redistribution | INFERRED, review advisable |
| Strapi EE-licensed code in a default install / cloud-account condition | Low–Medium | Low | Do not enable EE features. Legal check | Open |
| Directus grant lapse or license change | Medium | Low–Medium | Track key renewal. Stay within Core limits as fallback. Pin versions | Open |
| Data-source terms (events, POIs) | High | Medium | Per-source review in `05` | Open |
| Missing map attribution | High | Medium | Attribution component plus a test | TODO |

---

## Verification log (2026-10-11)

- **Checked:** license files of all 8 repos at the revisions listed in `01`. Strapi `LICENSE` and Directus `license` at tags v5.57.0 / v12.5.0 diffed against HEAD (identical). Directus v11.17.4 BSL text. Strapi package-level LICENSE files (review-workflows, content-releases, i18n) and `@strapi/strapi` dependencies. Directus entitlement code. PostGIS `LICENSE.TXT`. PostGIS FAQ. FSF GPL FAQ (#MereAggregation, #UnreleasedMods, #UnreleasedModsAGPL, #GPLInProprietarySystem). Directus pricing, grant docs, and v12 license announcement. Strapi pricing.
- **Corrections:** see the box under the Executive summary.
- **UNVERIFIED:** MPL-2.0 and ODbL clause details (not re-read in this pass). Angular/NestJS licenses. The Directus grant usage agreement. Strapi enterprise-terms content. Full transitive dependency license scan (no SBOM tool was run). All data-source terms.
- **BLOCKED:** a first FSF FAQ fetch returned 429/403. A retry of `gpl-faq.en.html` succeeded.
