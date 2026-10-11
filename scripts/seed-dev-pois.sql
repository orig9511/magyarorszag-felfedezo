-- DEVELOPMENT SAMPLE DATA ONLY. Inserts a few clearly labelled sample POIs (source = 'dev-sample').
-- Idempotent (skips rows that already exist) and never updates or deletes anything.
-- Coordinates are WGS84 lon/lat (PostGIS order: X = longitude, Y = latitude).
-- No county rows are created: real boundaries must come from a licensed dataset (see docs/research/04).
-- Usage: psql "$DATABASE_URL" -f scripts/seed-dev-pois.sql
INSERT INTO pois (name, description, category, location, "countyId", source, "sourceId", address)
SELECT v.name, v.description, v.category, ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326),
       'dev-sample', 'dev-sample', v.source_id, v.address
FROM (VALUES
  ('Debrecen Great Church (sample)', 'Sample record: Reformed Great Church of Debrecen', 'attraction', 21.6256, 47.5317, 'sample-debrecen-great-church', 'Debrecen, Kálvin tér'),
  ('Debrecen Déri Museum (sample)', 'Sample record: museum in Debrecen city centre', 'attraction', 21.6290, 47.5300, 'sample-debrecen-deri', 'Debrecen, Déri tér'),
  ('Hungarian Parliament (sample)', 'Sample record: Parliament building, Budapest', 'attraction', 19.0456, 47.5071, 'sample-budapest-parliament', 'Budapest, Kossuth Lajos tér'),
  ('Sample restaurant, Debrecen', 'Sample record only; not a real business listing', 'restaurant', 21.6270, 47.5290, 'sample-debrecen-restaurant', NULL)
) AS v(name, description, category, lng, lat, source_id, address)
WHERE NOT EXISTS (
  SELECT 1 FROM pois p WHERE p.source = 'dev-sample' AND p."sourceId" = v.source_id
);
