-- DEVELOPMENT ONLY: marks all imported counties active so they are selectable on the map.
-- Touches only the `active` flag of rows from the Lechner import; geometry, provenance and POIs are untouched.
UPDATE counties SET active = true WHERE source = 'lechner-inspire-au' AND NOT active;
