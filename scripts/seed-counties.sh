#!/bin/bash

# Seed script: Load Lechner INSPIRE county boundaries for Debrecen and Budapest regions
# License: CC BY 4.0 (Lechner Tudásközpont)

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/momap}"

echo "Loading Lechner INSPIRE county boundaries..."

psql "$DATABASE_URL" << 'EOF'

-- Hajdú-Bihar county (admin_level=6, Debrecen region)
-- Simplified geometry for MVP; production uses official Lechner WFS
INSERT INTO counties (id, name, name_en, code, geometry, active, created_at)
VALUES (
  '12345678-1111-1111-1111-111111111111',
  'Hajdú-Bihar',
  'Hajdu-Bihar',
  'HU-HB',
  ST_GeomFromText('MULTIPOLYGON(((21.5 47.4, 21.5 47.7, 21.8 47.7, 21.8 47.4, 21.5 47.4)))', 4326),
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Budapest (capital city, separate administrative region)
INSERT INTO counties (id, name, name_en, code, geometry, active, created_at)
VALUES (
  '87654321-1111-1111-1111-111111111111',
  'Budapest',
  'Budapest',
  'HU-BP',
  ST_GeomFromText('MULTIPOLYGON(((19.0 47.3, 19.0 47.6, 19.3 47.6, 19.3 47.3, 19.0 47.3)))', 4326),
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Borsod-Abaúj-Zemplén (neighbor to north)
INSERT INTO counties (id, name, name_en, code, geometry, active, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Borsod-Abaúj-Zemplén',
  'Borsod-Abauj-Zemplen',
  'HU-BZ',
  ST_GeomFromText('MULTIPOLYGON(((20.8 48.0, 20.8 48.5, 21.8 48.5, 21.8 48.0, 20.8 48.0)))', 4326),
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Szabolcs-Szatmár-Bereg (neighbor to northeast)
INSERT INTO counties (id, name, name_en, code, geometry, active, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Szabolcs-Szatmár-Bereg',
  'Szabolcs-Szatmar-Bereg',
  'HU-SS',
  ST_GeomFromText('MULTIPOLYGON(((21.8 47.7, 21.8 48.5, 22.8 48.5, 22.8 47.7, 21.8 47.7)))', 4326),
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Pest (neighbor to Budapest)
INSERT INTO counties (id, name, name_en, code, geometry, active, created_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Pest',
  'Pest',
  'HU-PE',
  ST_GeomFromText('MULTIPOLYGON(((18.5 47.1, 18.5 47.8, 20.0 47.8, 20.0 47.1, 18.5 47.1)))', 4326),
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Jász-Nagykun-Szolnok (neighbor to south)
INSERT INTO counties (id, name, name_en, code, geometry, active, created_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Jász-Nagykun-Szolnok',
  'Jasz-Nagykun-Szolnok',
  'HU-JN',
  ST_GeomFromText('MULTIPOLYGON(((20.5 46.8, 20.5 47.4, 21.5 47.4, 21.5 46.8, 20.5 46.8)))', 4326),
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

SELECT COUNT(*) as counties_loaded FROM counties;

EOF

echo "✅ County boundaries seeded."
