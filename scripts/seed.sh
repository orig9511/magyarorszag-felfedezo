#!/bin/bash
# Seed script for development data

# Start the database if not already running
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
sleep 5

# Run migrations
docker-compose exec -T postgres psql -U momap -d momap -f /docker-entrypoint-initdb.d/001_init.sql

# Load county data (Lechner INSPIRE dataset - CC BY 4.0)
# This is a placeholder; actual GeoJSON should be imported from the source
echo "Loading county data..."

# Insert sample counties (simplified geometries for development)
docker-compose exec -T postgres psql -U momap -d momap << EOF
-- Debrecen / Hajdú-Bihar (initial MVP focus)
INSERT INTO counties (name, name_en, code, geometry, active) VALUES
('Hajdú-Bihar', 'Hajdu-Bihar', 'HU-HB',
  ST_GeomFromText('MULTIPOLYGON(((47.5 21.5, 47.5 22.5, 46.5 22.5, 46.5 21.5, 47.5 21.5)))', 4326),
  true);

-- Budapest (secondary MVP focus)
INSERT INTO counties (name, name_en, code, geometry, active) VALUES
('Budapest', 'Budapest', 'HU-BU',
  ST_GeomFromText('MULTIPOLYGON(((47.6 19.0, 47.6 19.3, 47.3 19.3, 47.3 19.0, 47.6 19.0)))', 4326),
  true);

-- Sample POIs for Debrecen
INSERT INTO pois (name, description, category, location, county_id, source, source_id, address, website)
SELECT
  'Debrecen Great Church',
  'Historic Protestant church in Debrecen',
  'attraction',
  ST_GeomFromText('POINT(47.533 21.633)', 4326),
  (SELECT id FROM counties WHERE code = 'HU-HB'),
  'osm',
  'node:123456',
  'Kálvin tér, Debrecen',
  'https://nagytemplom.hu'
WHERE NOT EXISTS (SELECT 1 FROM pois WHERE source_id = 'node:123456');

INSERT INTO pois (name, description, category, location, county_id, source, source_id, address, website)
SELECT
  'Thermal Bath Debrecen',
  'Historic thermal bath complex',
  'attraction',
  ST_GeomFromText('POINT(47.520 21.645)', 4326),
  (SELECT id FROM counties WHERE code = 'HU-HB'),
  'osm',
  'node:789012',
  'Nagyerdei Park, Debrecen',
  'https://termalbath.debrecen.hu'
WHERE NOT EXISTS (SELECT 1 FROM pois WHERE source_id = 'node:789012');
EOF

echo "Seed data loaded successfully."
