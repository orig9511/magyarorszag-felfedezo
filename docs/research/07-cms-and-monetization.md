# Security & Operational Risk Assessment

## Critical Blockers (MUST Fix Before Launch)

| Issue | Severity | Fix Timeline | Mitigation |
|-------|----------|---|---|
| Secrets in Git (.env files) | CRITICAL | Week 1 | Pre-commit hooks, HashiCorp Vault |
| OSM attribution missing | CRITICAL | Before data live | Attribution display system |
| GDPR erasure not implemented | CRITICAL | Week 12 | Code template provided |
| Login rate limiting disabled | CRITICAL | Week 2 | Redis-backed limiter, 5 attempts/15min |

## Authentication & Authorization

✅ **Recommended:**
- JWT tokens (HS256 or RS256)
- Refresh token rotation (30-day expiry)
- MFA support (TOTP, WebAuthn for admin)
- OAUTH 2.0 integration (optional)

✅ **Admin Access Control:**
- Role-based permissions (admin, editor, moderator, user)
- Principle of least privilege
- Session timeout (30 min inactivity)
- Audit logging all admin actions

## API Security

✅ **Rate Limiting (Required):**
```javascript
// NestJS throttle decorator
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per 60 seconds
@Post('/pois/:id/flag')
async flagPOI(@Param('id') id) { ... }
```

✅ **Input Validation:**
```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({
  whitelist: true,  // Strip unknown properties
  forbidNonWhitelisted: true,
  transform: true
}));
```

✅ **CORS Configuration:**
```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

## Data Protection

✅ **Encryption at Rest:**
```sql
-- PostgreSQL pgcrypto for sensitive data
CREATE EXTENSION pgcrypto;
ALTER TABLE users ADD COLUMN password_hash text;
UPDATE users SET password_hash = crypt(password, gen_salt('bf'));
```

✅ **Encryption in Transit:**
- TLS 1.3+ enforced
- HSTS headers
- Certificate pinning for mobile apps

✅ **Secret Management:**
```yaml
# Docker/Kubernetes secrets (not .env files)
apiVersion: v1
kind: Secret
metadata:
  name: momap-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://...
  JWT_SECRET: ${generate_random_key}
  STRIPE_API_KEY: ${billing_key}  # if future payment
```

## Dependency Vulnerabilities

✅ **Automated Scanning:**
```yaml
# GitHub Actions workflow
name: Dependency Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: npm audit
        run: npm audit --audit-level=moderate
      - name: pip safety
        run: pip install safety && safety check
```

## GDPR Compliance Checklist

- [ ] **Legal basis documented** (Article 6)
- [ ] **Privacy policy** drafted and published
- [ ] **Data processing agreements (DPAs)** signed with:
  - [ ] OpenStreetMap (data provider)
  - [ ] Wikidata (data provider)
  - [ ] kulturinfo.hu (data provider)
  - [ ] Hosting provider (database)
- [ ] **User rights endpoints implemented:**
  - [ ] Data export (Article 20)
  - [ ] Right to erasure (Article 17)
  - [ ] Right of access (Article 15)
- [ ] **Breach notification procedure** (72-hour requirement)
- [ ] **Privacy Impact Assessment (DPIA)** completed
- [ ] **Consent management** for optional tracking
- [ ] **Audit logging** for all data access
- [ ] **Data retention policy** implemented (auto-deletion)

## Pre-Launch Security Audit

**External audit recommended (€3-8K):**
- Penetration testing
- SQL injection testing
- XSS vulnerability scanning
- Authentication flow review
- GDPR compliance review
- License compliance verification

**Timeline:** Week 15-16 (before public launch)

---

# CMS & Monetization Strategy

## Strapi (MIT) Editorial CMS

### Capabilities for Tourism Platform

✅ **Content Types:**
- Articles (blog posts, destination guides)
- Destination guides (multi-section, featured images)
- Event listings (editorial)
- Recommendations (seasonal, curated lists)
- Media library (images, videos)

✅ **Editorial Workflow:**
- Draft → Review → Publish
- Content scheduling (publish on specific dates)
- Multi-language support (EN, HU)
- Revision history and rollback

✅ **Integrations:**
- REST API (auto-generated from content types)
- GraphQL API (query any content)
- Webhooks (notify backend when content updates)
- File storage (local filesystem or S3)

### Deployment (Self-Hosted)

```yaml
# docker-compose.yml excerpt
services:
  strapi:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./cms:/app
    ports:
      - "1337:1337"
    environment:
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi_user
      DATABASE_PASSWORD: ${STRAPI_DB_PASS}
      JWT_SECRET: ${JWT_SECRET}
    command: npm run develop
```

---

## Future Monetization Model (Phase 5)

### Sponsored Listings

**Data Model:**
```sql
CREATE TABLE sponsored_listings (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    listing_type VARCHAR(50), -- 'featured_poi', 'promoted_event'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    placement VARCHAR(50), -- 'map_pin', 'search_results_top', 'category_featured'
    daily_budget DECIMAL(8,2),
    total_budget DECIMAL(10,2),
    impressions_goal INTEGER,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'  -- active, paused, ended, pending_payment
);

CREATE TABLE sponsored_transactions (
    id SERIAL PRIMARY KEY,
    sponsored_listing_id INTEGER REFERENCES sponsored_listings(id),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_date TIMESTAMP DEFAULT NOW(),
    payment_method VARCHAR(50),  -- 'stripe', 'bank_transfer'
    payment_status VARCHAR(20) DEFAULT 'pending'  -- pending, completed, failed
);
```

### Advertising Model

- **Pay-per-impression (PPM):** €0.50-2.00 per 1000 impressions
- **Pay-per-click (PPC):** €0.10-0.50 per click
- **Category-based targeting:** Premium categories (luxury hotels, restaurants) higher rates
- **Geographic targeting:** Budapest premium, regions standard
- **Seasonal pricing:** High season (summer) 2x base price

### Business Accounts

```sql
CREATE TABLE business_accounts (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255),
    owner_user_id INTEGER REFERENCES users(id),
    category VARCHAR(50),
    claimed_poi_id INTEGER REFERENCES pois(id),
    subscription_tier VARCHAR(20),  -- 'free', 'pro', 'premium'
    billing_email VARCHAR(255),
    payment_method_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    subscription_renewal_date DATE,
    FOREIGN KEY(owner_user_id) REFERENCES users(id),
    FOREIGN KEY(claimed_poi_id) REFERENCES pois(id)
);

-- Features by tier:
-- Free: Claim POI, add photos, respond to reviews, basic analytics
-- Pro (€9/month): Sponsored listing, email marketing, advanced analytics
-- Premium (€29/month): Multiple listings, priority support, custom campaigns
```

---

## Payment Processing (Future)

**Recommendation:** Stripe for payment processing (simplest for European businesses)

```typescript
// backend/modules/business/billing.service.ts
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  async createSubscription(businessId: number, tier: string) {
    const business = await this.businessRepository.findOne(businessId);
    
    const subscription = await this.stripe.subscriptions.create({
      customer: business.stripe_customer_id,
      items: [{
        price: process.env[`STRIPE_PRICE_${tier.toUpperCase()}`]
      }]
    });
    
    business.subscription_tier = tier;
    business.subscription_renewal_date = new Date(subscription.current_period_end * 1000);
    await business.save();
    
    return subscription;
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.paid':
        // Update subscription status
        break;
      case 'invoice.payment_failed':
        // Send retry notification
        break;
    }
  }
}
```

---

## Analytics & Transparency

**Track (with GDPR consent):**
- Sponsored listing impressions & clicks (no PII)
- POI view counts (aggregate, no user tracking)
- Event attendance counts
- Search terms (no user attached)

**Display to businesses:**
- Dashboard showing impressions, clicks, conversions
- Spend tracking
- ROI calculator

**Transparent labeling:**
```html
<!-- Always label sponsored content -->
<div class="poi-card sponsored">
  <span class="badge">Sponsored</span>
  <h3>Featured Restaurant</h3>
  <p>This listing is promoted by the business</p>
</div>
```

---

## Conclusion

**Editorial CMS:** Strapi (MIT) handles all content with zero licensing cost.

**Monetization (Phase 5):** Sponsored listings + business accounts starting €0.10-2.00 per interaction.

**Payment processing:** Stripe for compliance + fraud prevention.

**Revenue potential:** €5-20K/month at scale (100k monthly users, 5% conversion to sponsored listings).

