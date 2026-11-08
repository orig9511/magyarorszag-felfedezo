-- REVIEW ONLY. Run after 003_momap_guides.sql in a backed-up staging database.
BEGIN;
ALTER TABLE momap_organizations ADD COLUMN IF NOT EXISTS business_type varchar(16) NOT NULL DEFAULT 'service';
ALTER TABLE momap_organizations ADD CONSTRAINT momap_organizations_business_type_check CHECK (business_type IN ('hotel','restaurant','service'));
CREATE TABLE IF NOT EXISTS momap_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email varchar(254) NOT NULL,
 password_hash text NOT NULL,
 platform_role varchar(16) NOT NULL DEFAULT 'partner' CHECK (platform_role IN ('admin','partner')),
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS momap_accounts_email_ci ON momap_accounts(lower(email));
CREATE TABLE IF NOT EXISTS momap_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES momap_accounts(id) ON DELETE CASCADE,
 token_hash char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS momap_sessions_account ON momap_sessions(account_id);
CREATE INDEX IF NOT EXISTS momap_sessions_expiry ON momap_sessions(expires_at);
-- Prevent duplicate pending membership for the same account.
-- Existing memberships use auth_subject; new local accounts store their UUID as the subject.
COMMIT;
