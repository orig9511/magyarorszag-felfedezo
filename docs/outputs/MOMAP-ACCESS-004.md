# MOMAP ACCESS-004 – Admin and sector-specific partner access

**Status:** source implementation; build/tests and database integration NOT VERIFIED. Migration proposal NOT APPLIED.

## Roles and verticals
- Platform admin: /access/admin – approves or rejects partner registrations.
- Hotel partner: /access/hotel – own organizations and guides.
- Restaurant partner: /access/restaurant – own organizations and guides.
- Service partner: /access/service – own organizations and guides.
- Separate URLs and business-type checks; one shared authentication implementation and organization memberships, not three password databases.
- Registration is pending until platform admin approval. No self-selected admin role.

## API
POST /api/access/register, POST /api/access/login, POST /api/access/logout
GET /api/access/me, /api/access/organizations, /api/access/guides
GET /api/access/admin/pending, POST /api/access/admin/:id/approve|reject

## Security limitations
- Session bearer token is kept in frontend memory only; reload requires login. No localStorage token or cookie storage.
- Sessions expire after 12 hours; token hashed at rest; password uses salted scrypt.
- Registration has no email verification, password reset, MFA, CAPTCHA or rate limiting. **Do not expose publicly until these are implemented and audited.**
- Admin bootstrap via MOMAP_BOOTSTRAP_ADMIN_EMAIL and MOMAP_BOOTSTRAP_ADMIN_PASSWORD must be run only in trusted local/staging environment. Remove credentials after first bootstrap. Bootstrap is not invoked automatically.
- Legacy operator-token APIs remain and MUST NOT be given to partners.
- Partner guide CRUD is not yet exposed. Current access dashboards are read-only lists.
- Authentication and business type are checked on server for sensitive data; client route check is convenience only.
- Requires 003 and 004 SQL proposals reviewed and applied on staging. Neither was applied here.
- Need strict request DTO limits, email verification, audit logging, rate limiting, lockout, password reset, MFA, and security testing before production.

## Local verification
```bash
npm ci
npm run build -w apps/backend
npm run build -w apps/frontend
```
