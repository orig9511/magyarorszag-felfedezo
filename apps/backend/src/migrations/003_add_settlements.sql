-- Migration 003: Add settlements table and settlement-county mapping

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  county_id UUID NOT NULL REFERENCES counties(id),
  ksh_code VARCHAR(20),
  ksh_name VARCHAR(255),
  population INTEGER,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  settlement_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_settlements_name ON settlements (name);
CREATE INDEX IF NOT EXISTS idx_settlements_county_id ON settlements (county_id);
CREATE INDEX IF NOT EXISTS idx_settlements_ksh_code ON settlements (ksh_code);

-- Seed major settlements for Hajdú-Bihar (priority 1)
-- TODO: Expand with all Hungarian settlements + KSH data
INSERT INTO settlements (name, name_en, county_id, settlement_type)
VALUES
  ('Debrecen', 'Debrecen', (SELECT id FROM counties WHERE name = 'Hajdú-Bihar' LIMIT 1), 'city'),
  ('Hajdúszoboszló', 'Hajdúszoboszló', (SELECT id FROM counties WHERE name = 'Hajdú-Bihar' LIMIT 1), 'town'),
  ('Hajdúböszörmény', 'Hajdúböszörmény', (SELECT id FROM counties WHERE name = 'Hajdú-Bihar' LIMIT 1), 'town'),
  ('Balmazújváros', 'Balmazújváros', (SELECT id FROM counties WHERE name = 'Hajdú-Bihar' LIMIT 1), 'town'),
  ('Hortobagy', 'Hortobagy', (SELECT id FROM counties WHERE name = 'Hajdú-Bihar' LIMIT 1), 'village')
ON CONFLICT DO NOTHING;

-- Seed major settlements for Budapest (priority 2)
-- Note: Budapest is its own administrative region; placeholder county_id needed
-- TODO: Handle Budapest separately or create pseudo-county
INSERT INTO settlements (name, name_en, county_id, settlement_type)
VALUES
  ('Budapest', 'Budapest', (SELECT id FROM counties WHERE name = 'Budapest' LIMIT 1), 'capital')
ON CONFLICT DO NOTHING;
