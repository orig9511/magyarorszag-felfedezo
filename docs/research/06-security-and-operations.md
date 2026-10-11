# Security & Operations

**Status:** Audit draft, 2026-10-11. Nothing in this file is an approved decision.
**Scope:** authentication/authorisation and admin audit trail, input validation, rate limiting, secrets, dependency and supply-chain risk, GDPR and data minimisation, backups and restore testing, monitoring and logging, ingestion-job reliability, and incident basics.
**Target profile:** one maintainer (the user plus AI agents), one EU VPS for about EUR 20–50/month, Docker Compose, proprietary code, Hungarian-first public site, Debrecen / Hajdú-Bihar first. No billing or business portal in the MVP (see `mvp-decisions`).

### Evidence tags

| Tag | Meaning in this file |
|-----|----------------------|
| **VERIFIED** | Checked on 2026-10-11 against the primary source listed in `_sources-06.md` |
| **INFERRED** | Reasoned recommendation or conclusion drawn from verified facts; not a legal opinion |
| **UNVERIFIED** | Plausible but not checked in this pass |
| **BLOCKED** | A check was attempted and failed for a tooling reason (recorded inline) |

### Provenance

This file distils the earlier loose drafts in `D:\Github\momap\` (`SECURITY_OPERATIONAL_RISK_ASSESSMENT.md`, `SECURITY_EXECUTIVE_SUMMARY.md`, `SECURITY_QUICK_REFERENCE.md`, `SECURITY_CHECKLIST_PRE_LAUNCH.md`, `OPERATIONAL_SECURITY_RUNBOOK.md`, and the security and ops parts of `SYSTEM_ARCHITECTURE.md` and `IMPLEMENTATION_CHECKLIST.md`). Those drafts were treated as **UNVERIFIED**. Several of their claims are corrected below (see "Corrections to earlier drafts"). The drafts were sized for a 4–5 person team with a security officer, a DPO, Kubernetes, and Vault, which does not fit this project.

---

## Assumed Deployment (for this analysis only)

```
Internet ──► reverse proxy (TLS, HTTP->HTTPS, coarse rate limit, security headers)
               ├── Angular static build
               ├── NestJS API  ──────────────┐
               └── CMS admin (Strapi|Directus, still open)
                                              ▼
              worker (scheduled ingestion) ─► PostgreSQL + PostGIS (no published port)
              backup job ─► encrypted, off-server copy
```

- One host and one Compose project. No Kubernetes, no Vault, no Elasticsearch, and no Prometheus/Grafana in the MVP. **INFERRED.** This contradicts parts of `03-architecture-proposal.md` (K8s in production, Prometheus) and `08-implementation-roadmap.md`. Reconcile it in the roadmap rewrite.
- Redis is optional. A single API instance can rate-limit in memory (see below), and a Postgres-backed schedule or queue avoids running an extra service. **INFERRED.** This is still an open decision in `09` (#14).
- The worker language is open. `05` shows Python/Celery code, which does not fit a NestJS/TypeScript codebase that one person maintains. **INFERRED:** prefer one language unless a library forces otherwise.

---

## Threat Model (Short)

| Asset | Main threat | Likelihood | Impact | Notes |
|-------|-------------|-----------|--------|-------|
| CMS / app admin accounts | Credential stuffing, phishing, session theft | Medium | High (defacement, data leak, fake sponsored content) | Few accounts, all high-value |
| VPS root / SSH | Brute force, exposed services, unpatched host | Medium | Critical | Docker can expose ports past the host firewall (see Secrets & Host) |
| PostgreSQL data | Injection, exposed port, lost disk | Low–Medium | High | Most of the content is public; the personal data is the sensitive part |
| Organiser / business contact data | Over-collection, unlawful reuse, breach | Medium | Medium (GDPR) | See GDPR section |
| Ingestion pipeline | Malicious or garbage upstream data, SSRF, schema drift | Medium | Medium | Untrusted input that arrives through a "trusted" path |
| Public API | Scraping, expensive viewport queries (DoS) | High | Low–Medium | The map API is public by design |
| Backups | Missing, unrestorable, unencrypted, same failure domain | Medium | Critical | The most common way small operators lose everything (**INFERRED**) |
| Supply chain (npm, images, CMS) | Malicious or vulnerable package | Medium | High | OWASP Top 10:2025 lists "A03 Software Supply Chain Failures" (**VERIFIED**) |

OWASP Top 10:2025 ranks **A01 Broken Access Control** first (**VERIFIED**). For this project that means admin route guards and, later, business-claim ownership checks.

---

## Authentication & Authorization

### MVP scope decision (proposed)

- **Proposal:** the MVP public site has **no end-user accounts**. It is read-only map browsing, plus an optional contact or report form. Only staff (the user, possibly a few editors) log in. **INFERRED.** This removes most GDPR rights tooling, password-reset abuse, and account-takeover surface. Favourites and reviews can come later. Add this to `09` as a decision.
- Two login surfaces remain. One is the **CMS admin** (built into Strapi or Directus). The other is any **NestJS admin/moderation endpoint**. Keep it to one if possible: do moderation in the CMS UI, or in a minimal NestJS admin that sits behind the same SSO. **INFERRED.**

### Passwords (when we store any)

| Item | Recommendation | Tag |
|------|----------------|-----|
| Hash | Argon2id, minimum m=19 MiB, t=2, p=1 (OWASP). bcrypt only as legacy, with cost ≥ 10 and a 72-byte input limit | **VERIFIED** (OWASP Password Storage CS) |
| Length | ≥ 15 characters if the password is the only factor. ≥ 8 allowed when MFA is enforced | **VERIFIED** (NIST SP 800-63B-4) |
| Composition rules | **None.** NIST says verifiers "SHALL NOT impose other composition rules" | **VERIFIED** |
| Forced periodic rotation | **None.** Force a change only on evidence of compromise | **VERIFIED** (NIST) |
| Blocklist | Check new passwords against a common or breached list | **VERIFIED** (NIST "SHALL") |
| Error messages | Generic for login, reset, and registration. Avoid differences in timing or status code | **VERIFIED** (OWASP Authentication CS) |
| Lockout | Throttle per account and per IP. Hard lockout can be abused for DoS, so prefer progressive delay | **VERIFIED** (OWASP Authentication CS warns about lockout DoS) |

### MFA and admin access

- **MFA (TOTP) is mandatory for every admin/editor account.** OWASP calls MFA "by far the best defense against the majority of password-related attacks" (**VERIFIED**). Whether the free/community editions of Strapi and Directus offer built-in admin 2FA: **UNVERIFIED**. This is a CMS selection criterion for `07`/`09`.
- Put the CMS admin on a separate hostname (e.g. `admin.` subdomain). Where practical, restrict it with an IP allowlist or a WireGuard/Tailscale-style tunnel. **INFERRED.** This cuts internet-wide brute force at near-zero cost.
- Sessions: for a first-party SPA served from the same site, an opaque server-side session in an `HttpOnly; Secure; SameSite=Lax` cookie is simpler to get right than RS256 JWT plus refresh-token rotation, and easier to revoke. **INFERRED.** If JWTs are used, keep them short-lived and keep a server-side revocation path. The draft's "RS256, not HS256" rule only matters when multiple services verify tokens. With one API it is not required. **INFERRED.**

### Authorization model

- Roles: `admin`, `editor`, `moderator`. Deny by default. Check roles in a NestJS guard on every admin route, not only in the UI. **INFERRED.**
- The data-model hook for a future business claim (`owner_id`/`claim_status`) needs object-level checks ("can this user edit *this* listing?"). Test them explicitly when the feature arrives. **INFERRED** (from OWASP A01).

### Admin audit trail

| Option | What it gives | Tag |
|--------|---------------|-----|
| Strapi built-in Audit Logs | Records admin content, role, user, and token changes and login attempts, **but only on the Enterprise plan** | **VERIFIED** (Strapi docs) |
| Directus activity + revisions | `directus_activity` and `directus_revisions` (deltas plus snapshots). Optional retention defaults to `90d` when `RETENTION_ENABLED=true` | **VERIFIED** (Directus logging docs). Exact fields per record are **INFERRED** from Directus feature pages |
| Own `audit_event` table | Needed in either case for NestJS admin/moderation actions and ingestion overrides | **INFERRED** |

**Implication for the CMS decision (`07`):** with Strapi Community Edition, the admin audit trail has to be built or approximated (for example with lifecycle hooks). Directus includes it. This is a real differentiator. Weigh it alongside licence terms in `02`. **INFERRED.**

Minimal own table (append-only; the app role has `INSERT`/`SELECT` but no `UPDATE`/`DELETE`):

```sql
CREATE TABLE audit_event (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    bigint,            -- staff user; NULL for system/worker
  actor_kind  text NOT NULL,     -- 'staff' | 'worker' | 'system'
  action      text NOT NULL,     -- 'poi.publish', 'event.reject', 'role.grant', 'login.fail'
  entity_type text,
  entity_id   text,
  diff        jsonb,             -- changed fields only; never secrets
  request_id  text,
  ip_prefix   inet               -- truncated (/24, /48) to minimise personal data
);
```

Log at least these: authentication success and failure, authorization failures, use of admin privileges, and user/role administration (**VERIFIED**: OWASP Logging CS "always log" list).

---

## Input Validation & Output Encoding

- **DTO validation:** a global `ValidationPipe` with `whitelist` (strips undecorated properties), `forbidNonWhitelisted` (rejects them instead), and `transform` (converts to DTO and primitive types). It uses `class-validator` and `class-transformer`. **VERIFIED** (NestJS docs).
- **SQL:** use only parameterised queries or a query builder. Never interpolate strings into SQL. **INFERRED** (standard practice).
- **Viewport and geo queries are a DoS vector:** validate `bbox` ranges (lat −90..90, lon −180..180, and in practice clamp to a Hungary envelope), cap the bbox area per zoom level, make `zoom` an integer in a fixed range, cap `limit`, and set a `statement_timeout` for the API DB role. **INFERRED.** See `04` for query design.
- **Rich text / HTML:** Angular treats bound values as untrusted and sanitises `[innerHTML]`. `bypassSecurityTrust*` must be used only on values that have been verified. **VERIFIED** (Angular security guide). Store ingested descriptions as **plain text**, or sanitise them server-side to a small allowlist before storage. Never pass them through `bypassSecurityTrust*`. **INFERRED.**
- **Security headers:** a CSP (Angular supports nonces and Trusted Types, **VERIFIED**). Include the tile host(s) in `img-src`. Also HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and `frame-ancestors`. **INFERRED.**
- **Outbound links from ingested or business data:** allow only `http(s)` schemes, and use `rel="noopener nofollow ugc"` (`sponsored` where paid). **INFERRED.**
- **SSRF:** any feature that fetches a URL supplied by a source or user (iCal feed, image URL, link preview) should use allowlisted destinations, block loopback, RFC1918, and link-local/metadata addresses, validate resolved IPs (DNS rebinding), and disable redirects. **VERIFIED** (OWASP SSRF Prevention CS).
- **Uploads (CMS media):** limit size and type, re-encode images (which also strips EXIF GPS, a privacy issue), and never serve uploads from the API origin with executable types. **INFERRED.**

---

## Rate Limiting

- **Two layers:** a coarse per-IP limit at the reverse proxy, and an app-level `@nestjs/throttler`. **INFERRED.**
- `@nestjs/throttler` facts: `ttl` is in **milliseconds**. Multiple named throttlers are allowed. The default storage is **in-memory**. Redis storage is a community provider for multi-instance setups. Behind a proxy you must enable `trust proxy` (or override `getTracker()`). Otherwise every client shares the proxy's IP. **VERIFIED** (NestJS docs).
- One API instance means in-memory storage is enough. Do not add Redis just for rate limiting. **INFERRED.**
- The draft's `@Throttle(100, 60)` positional syntax is from before v5. Current versions take an object keyed by throttler name. **VERIFIED** (NestJS docs describe the v5+ object form).
- Starting values (tunable, not evidence-based): login 5/min per IP plus a per-account counter; public read endpoints a few hundred/min per IP with cache headers; write/report forms 5–10/hour per IP plus a CAPTCHA-free honeypot field. **INFERRED.**
- Scraping of our public data cannot be prevented completely. ODbL-derived content is open anyway (see `02`). Focus on keeping the server healthy, not on secrecy. **INFERRED.**

---

## Secrets & Host Hardening

| Topic | Recommendation | Tag |
|-------|----------------|-----|
| Storage | Docker Compose `secrets:` mounts each secret as a file at `/run/secrets/<name>`. Docker warns that environment variables are visible to all processes and can leak into logs | **VERIFIED** (Docker docs) |
| Vault / KMS | Not justified for one host and one maintainer | **INFERRED** |
| Repo hygiene | `.env*` in `.gitignore`. Commit `.env.example` only. Run a local pre-commit secret scanner (e.g. gitleaks; licence and features **UNVERIFIED**) | **INFERRED** |
| GitHub secret scanning | Free automatically only for **public** repos. User-owned private repos are not covered without Enterprise / Secret Protection. The proprietary repo therefore needs local or CI scanning | **VERIFIED** (GitHub docs) |
| Rotation | Rotate immediately on suspected exposure or offboarding. Calendar rotation is optional | **INFERRED** |
| Backup encryption key | Keep a copy **off the server** (password manager). Otherwise a lost server also means lost backups | **INFERRED** |
| SSH | Key-only, no root password login, automatic security updates for the host OS | **INFERRED** |
| Firewall vs Docker | Published container ports are routed **before** ufw rules apply, "effectively ignoring your firewall configuration". Do not publish DB/CMS-internal ports, or bind them to `127.0.0.1` | **VERIFIED** (Docker packet-filtering docs) |
| Example to avoid | The draft `SYSTEM_ARCHITECTURE.md` §6.4 publishes Prometheus `9090` and Grafana `3001` with `GF_SECURITY_ADMIN_PASSWORD: admin`. Together with the ufw bypass, that is a publicly reachable default-credential panel | **VERIFIED** (draft content read) / **INFERRED** (impact) |

---

## Dependency & Supply-Chain Risk

- **Lockfile discipline:** CI and image builds use `npm ci`. It fails if `package.json` and the lockfile disagree and never writes the lockfile. **VERIFIED** (npm docs).
- **Install scripts:** `--ignore-scripts` exists and blocks package lifecycle scripts. **VERIFIED.** It can break native modules (e.g. Argon2 bindings), so it may only be workable for the frontend build. **INFERRED.**
- **Alerts:** enable Dependabot alerts and security updates. They require the dependency graph and alerts to be enabled (**VERIFIED**). Whether they are free on a private personal repo is **UNVERIFIED** in this pass. Add `npm audit --omit=dev` as a CI signal, not a gate on every moderate finding. **INFERRED.**
- **Biggest tree = CMS.** Strapi or Directus brings most of the transitive dependencies and the largest attack surface. Watch its GitHub security advisories, keep within supported major versions, and keep the CMS admin off the open internet where possible. **INFERRED.**
- **Images:** pin base images by tag (ideally by digest), rebuild monthly for OS patches, and run containers as non-root where the image allows it. The provenance and maintenance status of the `postgis/postgis` image is **UNVERIFIED** here (see `01`/`04`).
- **Frontend map stack:** Leaflet core plus as few plugins as possible. Each plugin is unvetted third-party JS. **INFERRED.**
- **Licences:** run the licence checks in `02` together with the vulnerability checks so that a GPL/AGPL transitive dependency is caught at the same gate. **INFERRED.**

---

## GDPR & Data Minimisation

> Not legal advice. Items marked **legal review** need a qualified Hungarian/EU data-protection lawyer.

### Roles

- **Controller:** the platform operator (the legal entity is still open: sole trader vs Kft.). **INFERRED.**
- **Processors (Art. 28 contract needed):** the hosting provider, any transactional email provider, any error-tracking or analytics SaaS, and an off-site backup provider. Art. 28(1): use only processors "providing sufficient guarantees" (**VERIFIED**). Hetzner offers a DPA that the customer concludes in the account, after specifying data categories. It is **not automatic**. Cloud data in its DE/FI locations stays in the EU (**VERIFIED**, Hetzner docs).
- **Not processors:** OpenStreetMap, Wikidata, kulturinfo.hu, and other data sources. We are not processing data on their behalf, so "DPAs with OSM/Wikimedia" (in the drafts and `07`) are not the right instrument. Their **licence/ToS** terms apply instead (`02`, `05`). **INFERRED** from Art. 4(8)/28. **Legal review** for any source that supplies personal data.

### Data inventory (MVP)

| Category | Example fields | Purpose | Likely lawful basis | Proposed retention | Minimisation |
|----------|----------------|---------|---------------------|-------------------|--------------|
| Web server / proxy logs | IP, UA, path, time | Security, debugging | Art. 6(1)(f) | 14–30 days | Truncate IPs in long-lived logs and aggregates |
| Staff accounts | name, email, hash, TOTP secret, role | Admin access | Contract / 6(1)(f) | Account lifetime + short grace | No extra profile fields |
| Admin audit trail | actor, action, diff, IP prefix | Accountability, security | 6(1)(f) | 1–2 years (**decision**) | No secrets or full IPs in diffs |
| **Event organiser data** (ingested) | organiser name, public website, booking link; *possibly* contact person, phone, email | Show who runs an event | 6(1)(f) (**legal review**) | Organisation-level: while the listing is relevant. Personal contact fields: delete N months after the event ends | **Default: store the organisation name and source link only. Do not ingest personal names, phones, or emails.** |
| **Business contact data** (OSM/manual) | business name, address, phone, website, opening hours | POI listing | 6(1)(f) (**legal review**) | While the POI exists, plus source refresh | Business-level fields only. No owner names |
| Contact / report form | email, message | Corrections, takedowns | 6(1)(f) / pre-contract | 6–12 months after closure | Email optional where possible |
| Future: business claims | owner name, email, phone, verification evidence | Claim a listing | Contract (6(1)(b)) | Contract lifetime + legal retention (**UNVERIFIED**, Hungarian accounting rules) | Not in MVP |

**Organiser and business data, the key points:**

- Recital 14: the GDPR "does not cover the processing of personal data which concerns legal persons", including the legal person's name, form, and contact details. **VERIFIED.** However, many Hungarian businesses and organisers are **sole traders (egyéni vállalkozó)** or named individuals, and an address like `kovacs.janos@...` or a personal mobile number identifies a natural person. **INFERRED:** treat all organiser and business contact fields as personal data unless they clearly belong to a legal person.
- When personal data is not collected from the data subject (ingestion), Art. 14 requires informing them "within a reasonable period ... at the latest within one month". An exception applies where informing them "would involve a disproportionate effort" (Art. 14(5)(b)). **VERIFIED** text. Whether the exception applies to ingested organiser contacts is a **legal review** item. Not ingesting personal contact fields avoids the problem. **INFERRED.**
- Art. 6(1)(f) legitimate interests requires a documented balancing test. The EDPB has published Guidelines 1/2024 on Art. 6(1)(f) (v1.0, public consultation Oct–Nov 2024). **VERIFIED** existence. Whether a later final version exists is **UNVERIFIED**. Write a one-page LIA per category above. **INFERRED.**
- Data minimisation ("limited to what is necessary") and storage limitation (identifiable "for no longer than is necessary") are Art. 5(1)(c) and 5(1)(e). **VERIFIED.**
- Provide a visible removal/correction channel on every listing ("Is this your business? Request correction/removal"). **INFERRED.**

### Obligations sized for a solo operator

| Obligation | Proportionate approach | Tag |
|------------|------------------------|-----|
| Data subject requests | Reply "without undue delay and in any event within one month" (Art. 12(3)). At MVP scale, a documented manual email process plus SQL scripts is enough; self-service export/erasure endpoints (drafts, `05`) can wait until end-user accounts exist | **VERIFIED** (deadline) / **INFERRED** (approach) |
| Records of processing (Art. 30) | The <250-employee exemption does **not** apply when processing "is not occasional". Keep a short RoPA (the table above is a start) | **VERIFIED** (text) / **INFERRED** (applies to us) |
| DPO (Art. 37) | Required for large-scale regular and systematic monitoring as a core activity. Likely **not** required for a tourism directory without tracking | **VERIFIED** (text) / **INFERRED** + legal review |
| DPIA | Likely not required if we do **no** server-side location tracking or profiling. Use browser geolocation only client-side to centre the map, and never store it | **INFERRED** |
| Cookies / analytics | Store nothing non-essential in the browser without consent (ePrivacy Art. 5(3)). Prefer cookieless, self-hosted analytics, or server-log statistics. The Hungarian implementing rules were not reviewed | **BLOCKED** (EUR-Lex ePrivacy page returned empty; content **INFERRED** from prior knowledge) / **UNVERIFIED** (HU law) |
| Privacy notice | Hungarian first, English second. Cover the ingestion sources and the removal channel | **INFERRED** |
| Backups vs erasure | Erased data persists in backups until they rotate out. State the backup retention in the privacy notice and re-apply erasures after any restore | **INFERRED** |

### Breach handling

- Notify the supervisory authority "without undue delay and, where feasible, not later than 72 hours" after becoming aware, unless the breach is unlikely to result in a risk (Art. 33(1)). **VERIFIED.**
- In Hungary the authority is **NAIH** (Nemzeti Adatvédelmi és Információszabadság Hatóság). It runs an online "Adatvédelmi Incidensbejelentő Rendszer". **VERIFIED** (naih.hu). The form fields were not inspected (**UNVERIFIED**).
- Inform data subjects only when the breach is likely to be **high risk**, and then "without undue delay" (Art. 34(1)). There is no 72-hour clock for this. **VERIFIED.** The drafts' "users within 72 hours" is a misreading.
- **Document every breach**, including the ones you do not notify (Art. 33(5)). Keep a simple breach register. **VERIFIED.**
- Reference: EDPB Guidelines 9/2022 on personal data breach notification, v2.0 (final, published 4 April 2023). **VERIFIED.**

---

## Backups & Restore Testing

Art. 32(1)(c)–(d) asks for the ability to restore availability "in a timely manner" and "a process for regularly testing" measures. **VERIFIED.**

| Item | Recommendation | Tag |
|------|----------------|-----|
| DB dump | Nightly `pg_dump -Fc`. The dump is internally consistent ("a snapshot of the database at the time pg_dump began") and does not block normal reads or writes | **VERIFIED** (PostgreSQL docs) |
| Roles / globals | `pg_dump` does **not** include roles. Also run `pg_dumpall --globals-only`. Restore fails to recreate ownership if the roles are missing | **VERIFIED** |
| Files | CMS uploads volume, reverse-proxy config, Compose files (in git, minus secrets) | **INFERRED** |
| Encryption + off-site | Encrypt on the client (e.g. restic or borg; features **UNVERIFIED**) and send to storage in a **different failure domain** (another provider or location). Provider snapshots are a bonus, not the backup | **INFERRED** |
| Retention | e.g. 7 daily, 4 weekly, 3–6 monthly. Shorter monthly retention also limits how long erased data persists | **INFERRED** |
| RPO / RTO (MVP) | RPO 24 h, RTO "same day" (a few hours of manual work). WAL archiving / PITR (the third PostgreSQL backup method, **VERIFIED** it exists) is deferred until data changes justify it | **INFERRED** (user decision) |
| Restore test | Scripted, **at least quarterly** (monthly is nicer): restore into a throwaway container with `psql -X --set ON_ERROR_STOP=on` / `pg_restore --exit-on-error`, run `ANALYZE`, then sanity queries (row counts per table, `ST_IsValid` on county geometries, latest event timestamp). Record the date and result | **VERIFIED** (ON_ERROR_STOP, ANALYZE advice) / **INFERRED** (cadence) |
| Backup monitoring | The backup job pings a dead-man's-switch heartbeat. If the ping is missing, an alert goes out | **INFERRED** |

Effort: **low** to set up, **low** ongoing, provided the restore test is a script and not a manual checklist.

---

## Monitoring & Logging

Minimum viable observability for one person. Each item should either page you or sit in a weekly glance:

1. **External uptime check** of the homepage and an `/api/health` that touches the DB. **INFERRED.**
2. **Heartbeat checks** for the nightly backup and each ingestion job. **INFERRED.**
3. **Disk space and TLS expiry alerts.** **INFERRED.**
4. **Container log rotation:** Docker's `json-file` driver does **not** rotate by default (`max-size` defaults to unlimited). Set `max-size`/`max-file` in `daemon.json` or per service. **VERIFIED** (Docker docs). Unrotated logs filling the disk is a classic outage on single-VPS setups. **INFERRED.**
5. **Structured JSON logs** from NestJS and the worker, with a request id. Log authentication and authorization failures and admin actions. **Never log** passwords, session ids, access tokens, keys, or connection strings. **VERIFIED** (OWASP Logging CS).
6. **Error tracking:** start with logs. If a SaaS such as Sentry is added, it becomes a processor (DPA, EU region, scrub PII). Its EU-region availability and pricing are **UNVERIFIED**.
7. Prometheus + Grafana (`03`, `SYSTEM_ARCHITECTURE.md`) cost RAM and maintenance and are not needed for the MVP. **INFERRED.**

---

## Ingestion Job Reliability

This complements `05` (sources, dedup) with the operational side. **INFERRED** unless noted.

- **Idempotent upserts** keyed on `(source, source_id)`. Re-running a job must never duplicate data.
- **Run log:** a `job_run` table (source, started_at, finished_at, status, fetched, inserted, updated, skipped, error). This drives the heartbeat and the weekly review.
- **No overlapping runs:** take a PostgreSQL advisory lock per source. Session-level locks are held until released or the session ends. Transaction-level locks release automatically at commit or rollback. **VERIFIED** (PostgreSQL docs).
- **Retries:** exponential backoff with jitter and a small cap (e.g. 3). Then mark the run failed and alert. Per-request timeouts. Use conditional requests (ETag / If-Modified-Since) where the source supports them.
- **Respect upstream limits:** each source's usage policy and ToS (Overpass, Wikidata SPARQL, etc.) is assessed in `04`/`05`. Use a descriptive User-Agent with contact info.
- **Circuit breaker for bad data:** if a run returns far fewer records than the previous one (e.g. under 50%), or fails schema validation above a threshold, **do not apply deletions or unpublish**. Quarantine the run and alert. This prevents an upstream outage from emptying the map.
- **Provenance and freshness:** `source`, `source_url`, `licence`, `fetched_at`, `last_seen_at`, `moderation_status` on every record. Hide events after `end_at`. Flag POIs not seen for N runs instead of deleting them.
- **Moderation gate:** records from a new source, or from user/organiser submissions, start as `pending`. Only trusted, structured sources auto-publish.
- **Untrusted content:** ingested text gets the same validation and sanitisation as user input (see Input Validation). Any URL the worker fetches follows the SSRF rules.

---

## Incident Basics (Solo Runbook)

| Severity | Example | Response target |
|----------|---------|-----------------|
| **S1** | Server or admin compromise, personal-data breach, data loss | Start immediately. The 72-hour NAIH clock may be running |
| **S2** | Site down, ingestion corrupting data, leaked non-critical key | Same day |
| **S3** | Single job failing, degraded performance | Next working session |

**Generic steps:** detect, then contain (maintenance mode, revoke sessions, rotate the affected secrets, firewall off), then **preserve evidence** (take a provider snapshot *before* wiping), then eradicate (rebuild from clean images and a known-good backup, do not "clean" a compromised host), then recover and verify, then decide on NAIH and data-subject notification (Art. 33/34), then write a short post-incident note in the breach/incident register.

**Five one-paragraph playbooks to write before launch (effort: low):**
1. Compromised admin account: disable it, kill sessions, reset the password and MFA, review `audit_event` and CMS activity for changes, and revert them.
2. Leaked secret (committed or logged): rotate it first, then purge it from history or logs. Assume it was used.
3. Suspected server compromise: snapshot, rebuild on a new VPS from git and backup, rotate **all** secrets.
4. Bad ingestion import: pause the source, restore the affected rows from the `job_run` diff or backup, add a validation rule.
5. Database loss or corruption: run the restore script (the one tested quarterly), then re-run ingestion to backfill since the last backup.

**Contacts sheet (offline copy):** hosting provider support/abuse, domain registrar, NAIH notification portal, legal counsel (to be chosen), password-manager recovery.

---

## Effort Summary

| Area | MVP effort | Ongoing | Notes |
|------|-----------|---------|-------|
| Staff auth + MFA + roles | **Medium** | Low | Lower if the CMS provides it |
| Admin audit trail | **Low** (Directus) / **Medium** (Strapi CE + own) | Low | Affects the CMS choice |
| Input validation + headers + SSRF rules | **Medium** | Low | Mostly conventions plus tests |
| Rate limiting | **Low** | Low | In-memory throttler plus proxy |
| Secrets + host hardening | **Low** | Low | One-time setup plus pre-commit scan |
| Supply chain | **Low** | **Medium** | Updates are the recurring cost, especially the CMS |
| GDPR docs (RoPA, LIAs, privacy notice, breach register) | **Medium** | Low | Plus a one-off **legal review** (cost **UNVERIFIED**) |
| Backups + restore script | **Low** | Low | Quarterly test |
| Monitoring / logging | **Low** | Low | External uptime, heartbeats, log rotation |
| Ingestion reliability | **Medium** | **Medium** | Per-source tuning |
| Incident runbook | **Low** | Low | Five playbooks |

---

## Corrections to Earlier Drafts

| Draft claim | Where | Correction | Tag |
|-------------|-------|-----------|-----|
| Passwords need uppercase, lowercase, number, and special character | `SECURITY_QUICK_REFERENCE.md`, checklist | NIST: SHALL NOT impose composition rules. Use length plus a blocklist | **VERIFIED** |
| bcrypt cost 12 or PBKDF2 as the default | same | OWASP prefers Argon2id. bcrypt is legacy | **VERIFIED** |
| 90-day secret rotation, HashiCorp Vault | drafts, `07` | Disproportionate for one host. Rotate on exposure | **INFERRED** |
| DPAs required with OSM, Wikimedia, kulturinfo.hu, Mobilizon | drafts, `07` | These are data sources, not processors. Licence/ToS apply. DPAs are for processors such as the host | **INFERRED** (legal review) |
| Users must be notified of a breach within 72 hours | `SECURITY_QUICK_REFERENCE.md` | 72 h applies to the authority. Data subjects: "without undue delay", and only for high risk | **VERIFIED** |
| "Audit logs older than 3 years (GDPR minimum retention)" | `05` | The GDPR sets no such minimum. Storage limitation applies. Retention is our decision | **VERIFIED** (Art. 5(1)(e)) / **INFERRED** |
| `@Throttle(100, 60)` | `07` | Pre-v5 signature. `ttl` is now in ms, in object form | **VERIFIED** |
| pgcrypto `crypt(password, ...)` with an UPDATE of a plaintext column | `07` | Hash in the application with Argon2id. Never hold plaintext in the DB | **INFERRED** |
| Kubernetes, multi-region active-active, RTO 30 min | drafts, `03` | Out of scope for a EUR 20–50/month solo MVP | **INFERRED** |
| Security officer / DPO / CEO sign-offs, EUR 100–160K security budget | drafts | Not applicable to a solo build (see `mvp-decisions`) | **INFERRED** |
| `07-cms-and-monetization.md` begins with a "Security & Operational Risk Assessment" section | `07` | Looks like misplaced content. Its substance is superseded by this file and should be removed from `07` in the verification pass | **VERIFIED** (file read) |

---

## Open Questions (for `09`)

1. MVP without end-user accounts? (Recommended: yes.)
2. CMS choice: is the built-in admin audit trail (Directus core vs Strapi Enterprise-only) a deciding factor? Do the community editions offer admin 2FA? (**UNVERIFIED**)
3. Organiser data policy: confirm "organisation name + link only, no personal contact fields" for ingestion.
4. Retention periods: proxy logs, audit trail, contact-form messages, backups.
5. Off-site backup target (provider, location) and the RPO/RTO you accept.
6. Legal entity (sole trader vs Kft.) and a one-off GDPR legal review: scope and budget.
7. Worker language (TypeScript in the monorepo vs Python) and whether Redis is needed at all.

---

## Summary

For a solo, single-VPS MVP, the security work that matters most is cheap. Keep the public site account-free. Put MFA on every admin login and keep the admin surface off the open internet. Never publish DB or internal ports, because Docker bypasses ufw. Use Compose file secrets and a pre-commit secret scan, since GitHub's free scanning does not cover the private repo. Keep the lockfile strict and stay current with CMS updates. Run nightly encrypted off-site `pg_dump` plus globals, with a scripted restore test. Rotate container logs, add heartbeat alerts, and make ingestion jobs idempotent with a "don't delete on a suspicious run" breaker. On GDPR, the main risk is **ingested organiser and business contact data**. Minimise it at ingestion, document a legitimate-interest balancing test, give a removal channel, and get a one-off legal review. The drafts' enterprise apparatus (Vault, K8s, DPO, external pen tests, Prometheus) is deferred until revenue or scale justifies it.
