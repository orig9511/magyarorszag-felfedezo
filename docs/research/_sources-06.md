# Sources for 06-security-and-operations.md (to be merged into 10-source-register.md)

| URL | Claim supported | Access date | Source type |
|-----|-----------------|-------------|-------------|
| https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 | GDPR Recital 14 (legal persons), Art. 5(1)(c),(e), 6(1)(f), 12(3) one-month deadline, 14(3)(a) and 14(5)(b), 28(1), 30(5), 32(1)(b)-(d), 33(1) 72 h, 33(5) document all breaches, 34(1) high risk / without undue delay, 37(1)(b) | 2026-10-11 | Official legal text |
| https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02002L0058-20091219 | ePrivacy Art. 5(3) consent for terminal storage. BLOCKED: page returned empty content | 2026-10-11 | Official legal text (fetch failed) |
| https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en | EDPB Guidelines 9/2022 on breach notification, v2.0 final, published 04 April 2023 | 2026-10-11 | Official doc (EDPB) |
| https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data-based_en | EDPB Guidelines 1/2024 on Art. 6(1)(f), v1.0, consultation 9 Oct - 20 Nov 2024 | 2026-10-11 | Official doc (EDPB) |
| https://naih.hu/ | NAIH is the Hungarian DPA. Online "Adatvédelmi Incidensbejelentő Rendszer" exists | 2026-10-11 | Official site (regulator) |
| https://docs.hetzner.com/general/general-terms-and-conditions/data-privacy-faq/ | Hetzner DPA concluded by the customer in the account (checkbox, data categories). Cloud data in DE/FI stays in the EU | 2026-10-11 | Official doc (vendor) |
| https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html | Argon2id min m=19 MiB, t=2, p=1. bcrypt legacy, cost ≥ 10, 72-byte limit. PBKDF2-SHA256 600k | 2026-10-11 | Official doc (OWASP) |
| https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | Generic error messages. MFA "by far the best defense". Lockout DoS trade-off | 2026-10-11 | Official doc (OWASP) |
| https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | Events to always log (authn, authz failures, admin actions). Data never to log (passwords, session ids, tokens, keys, connection strings) | 2026-10-11 | Official doc (OWASP) |
| https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html | SSRF: allowlist, block private/metadata ranges, DNS rebinding, disable redirects | 2026-10-11 | Official doc (OWASP) |
| https://top10.owasp.org/2025 | OWASP Top 10:2025 list (A01 Broken Access Control, A03 Software Supply Chain Failures, ...) | 2026-10-11 | Official doc (OWASP) |
| https://owasp.org/www-project-application-security-verification-standard/ | ASVS latest stable version is 5.0.0 | 2026-10-11 | Official doc (OWASP) |
| https://pages.nist.gov/800-63-4/sp800-63b.html | NIST SP 800-63B-4: min 15 chars single-factor / 8 with MFA, SHALL NOT impose composition rules or periodic change, SHALL check blocklist | 2026-10-11 | Official standard (NIST) |
| https://docs.nestjs.com/security/rate-limiting | @nestjs/throttler: ttl in ms, in-memory default store, community Redis store, trust proxy / getTracker, v5 object-form @Throttle | 2026-10-11 | Official doc |
| https://docs.nestjs.com/techniques/validation | ValidationPipe whitelist / forbidNonWhitelisted / transform. Uses class-validator and class-transformer | 2026-10-11 | Official doc |
| https://angular.dev/best-practices/security | Angular treats values as untrusted, sanitises innerHTML. bypassSecurityTrust* risk. CSP nonce and Trusted Types | 2026-10-11 | Official doc |
| https://docs.strapi.io/cms/features/audit-logs | Strapi Audit Logs available only on the Enterprise plan. Scope of what is logged | 2026-10-11 | Official doc (vendor) |
| https://directus.com/docs/configuration/logging | Directus ACTIVITY_RETENTION / REVISIONS_RETENTION default 90d, effective only with RETENTION_ENABLED | 2026-10-11 | Official doc (vendor) |
| https://directus.com/features/activity-log | Directus activity log records event, user, timestamp, IP, UA (seen via search summary only; not fetched directly) | 2026-10-11 | Vendor marketing page (secondary) |
| https://docs.docker.com/engine/network/packet-filtering-firewalls/ | Published ports bypass ufw rules ("effectively ignoring your firewall configuration") | 2026-10-11 | Official doc |
| https://docs.docker.com/compose/how-tos/use-secrets/ | Compose secrets mounted at /run/secrets/<name>. Env vars can leak to processes and logs | 2026-10-11 | Official doc |
| https://docs.docker.com/engine/logging/drivers/json-file/ | json-file driver: max-size default unlimited, so no rotation by default | 2026-10-11 | Official doc |
| https://www.postgresql.org/docs/current/backup.html | Three backup approaches: SQL dump, file-system, continuous archiving | 2026-10-11 | Official doc |
| https://www.postgresql.org/docs/current/backup-dump.html | pg_dump consistent snapshot, non-blocking. Roles not included, use pg_dumpall --globals-only. ON_ERROR_STOP. ANALYZE after restore | 2026-10-11 | Official doc |
| https://www.postgresql.org/docs/current/explicit-locking.html | Advisory locks: session-level vs transaction-level semantics | 2026-10-11 | Official doc |
| https://docs.npmjs.com/cli/v11/commands/npm-ci | npm ci fails on lockfile mismatch, never writes the lockfile. --ignore-scripts exists | 2026-10-11 | Official doc |
| https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning | Secret scanning free only on public repos. User-owned private repos need Enterprise / Secret Protection | 2026-10-11 | Official doc |
| https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates | Dependabot security updates require the dependency graph and alerts to be enabled (private-repo pricing not stated) | 2026-10-11 | Official doc |
