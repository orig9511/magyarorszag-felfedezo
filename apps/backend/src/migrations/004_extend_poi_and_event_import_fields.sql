-- Migration 004: Extend POI and Event schemas for source-aware imports

ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS osm_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS osm_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS wikidata_qid VARCHAR(64),
  ADD COLUMN IF NOT EXISTS alt_names TEXT,
  ADD COLUMN IF NOT EXISTS raw_tags JSONB,
  ADD COLUMN IF NOT EXISTS external_refs JSONB,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_pois_wikidata_qid ON pois (wikidata_qid);
CREATE INDEX IF NOT EXISTS idx_pois_osm_key ON pois (osm_type, osm_id);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Europe/Budapest',
  ADD COLUMN IF NOT EXISTS official_event_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS ticket_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
