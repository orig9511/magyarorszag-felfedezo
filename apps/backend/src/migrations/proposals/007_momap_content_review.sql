-- MOMAP-020: PROPOSAL ONLY. Do not apply without staging review and backup.
ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS "moderationStatus" varchar(16) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_momap_poi_moderation
  ON pois ("moderationStatus");

CREATE TABLE IF NOT EXISTS momap_content_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind varchar(8) NOT NULL CHECK (entity_kind IN ('event','poi')),
  entity_id uuid NOT NULL,
  action varchar(24) NOT NULL CHECK (action IN ('approve','quarantine','restore')),
  actor_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_momap_content_review_entity
  ON momap_content_review_log(entity_kind, entity_id, created_at DESC);

-- Backfill assessment of existing imported POIs and audit table availability
-- must precede release. This migration is never executed on app startup.
