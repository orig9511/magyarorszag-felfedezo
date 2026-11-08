# MOMAP-015 — Spatial county assignment

- Introduces SpatialCountyResolver using PostGIS ST_Covers over counties.geometry (SRID 4326).
- Coordinates are passed as parameterized longitude/latitude, never string-interpolated SQL.
- POI imports require exactly one matching active county; no fuzzy settlement fallback.
- Event imports with coordinates use the same spatial resolver. Events without coordinates retain legacy settlement fallback, which should be removed after event geocoding is available.
- Border points with two matches, points outside known county geometry, invalid coordinates and missing polygons fail closed.
- The existing imported 20 administrative geometries must be verified for coverage, validity, SRID and actual DB column names before running ingestion.
- Current import remains disabled by MOMAP_INGESTION_ENABLED and the source approval registry.
- No tests, builds, DB operations, scraper runs, deployment or merge performed.

Follow-up: fixture tests for county border/inside/outside, schema verification, remove fuzzy settlement fallback, geometry repair and diagnostics.
