-- MOMAP-MAPS-002: proposed additive PostgreSQL schema (NOT APPLIED).
-- Prerequisites: PostgreSQL with pgcrypto/gen_random_uuid, reviewed existing schema,
-- verified backup/restore and explicit migration approval.
-- Do not use TypeORM synchronize to apply this file.
BEGIN;

CREATE TABLE IF NOT EXISTS momap_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT momap_org_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT momap_org_name_nonempty CHECK (length(btrim(name)) > 0)
);

-- Auth subjects are external identities, not client-provided organization IDs.
-- Never grant membership based only on a claimed organization_id in request JSON.
CREATE TABLE IF NOT EXISTS momap_organization_memberships (
  organization_id uuid NOT NULL REFERENCES momap_organizations(id) ON DELETE CASCADE,
  auth_subject varchar(255) NOT NULL,
  role varchar(16) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, auth_subject),
  CONSTRAINT momap_member_subject_nonempty CHECK (length(btrim(auth_subject)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_momap_memberships_subject
  ON momap_organization_memberships(auth_subject);

-- Public slugs are globally unique; never reuse slugs across organizations.
CREATE TABLE IF NOT EXISTS momap_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES momap_organizations(id) ON DELETE RESTRICT,
  slug varchar(80) NOT NULL UNIQUE,
  title varchar(100) NOT NULL,
  accent_color char(7) NOT NULL,
  logo_url text,
  center_lng double precision NOT NULL,
  center_lat double precision NOT NULL,
  zoom double precision NOT NULL,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT momap_guide_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT momap_guide_color_format CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT momap_guide_center_lng CHECK (isfinite(center_lng) AND center_lng BETWEEN -180 AND 180),
  CONSTRAINT momap_guide_center_lat CHECK (isfinite(center_lat) AND center_lat BETWEEN -90 AND 90),
  CONSTRAINT momap_guide_zoom CHECK (isfinite(zoom) AND zoom BETWEEN 0 AND 20),
  CONSTRAINT momap_guide_title_nonempty CHECK (length(btrim(title)) >= 2),
  CONSTRAINT momap_guide_categories_array CHECK (jsonb_typeof(categories) = 'array'),
  CONSTRAINT momap_guide_publication CHECK (NOT published OR published_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_momap_guides_organization
  ON momap_guides(organization_id);

-- A guide can feature a publicly licensed POI without owning it.
CREATE TABLE IF NOT EXISTS momap_guide_pois (
  guide_id uuid NOT NULL REFERENCES momap_guides(id) ON DELETE CASCADE,
  poi_id uuid NOT NULL REFERENCES pois(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  PRIMARY KEY (guide_id, poi_id)
);
CREATE INDEX IF NOT EXISTS idx_momap_guide_pois_poi ON momap_guide_pois(poi_id);

CREATE TABLE IF NOT EXISTS momap_guide_events (
  guide_id uuid NOT NULL REFERENCES momap_guides(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  PRIMARY KEY (guide_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_momap_guide_events_event ON momap_guide_events(event_id);

-- Read-side index for public guides; not a replacement for application-level checks.
CREATE INDEX IF NOT EXISTS idx_momap_guides_published_slug
  ON momap_guides(slug) WHERE published = true;

COMMIT;
