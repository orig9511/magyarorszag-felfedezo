# Geospatial Data & Mapping Strategy

## Approved Data Sources for Hungarian Geography

### 1. OpenStreetMap (ODbL 1.0 License)

**County & Settlement Boundaries:**
- ✅ **Verified:** OSM has complete Hungary coverage including all 19 counties, 174 districts, 3,152 municipalities
- ✅ **License:** Open Data Commons ODbL 1.0 (commercial use permitted)
- ✅ **Accuracy:** Community-maintained; quality varies by region
- ✅ **Attribution:** Required (link to https://www.openstreetmap.org/copyright)

**Usage:** Download from Overpass API or GeoJSON exports:
```bash
# Example: Query all county boundaries from Overpass API
curl 'https://overpass-api.de/api/interpreter' -d '
[bbox:45.74,16.11,48.58,22.90];
(relation["boundary"="administrative"]["admin_level"="4"];);
out geom;
'
```

**In Database:**
```sql
INSERT INTO counties (name, code, geometry)
SELECT properties->>'name' as name,
       properties->>'ref:hnt' as code,
       ST_GeomFromGeoJSON(geometry) as geometry
FROM osm_import
WHERE properties->>'boundary' = 'administrative'
  AND properties->>'admin_level' = '4';

CREATE INDEX idx_counties_geom ON counties USING GIST(geometry);
```

---

### 2. Hungarian Official Sources (KSH/Geoinformation Directorate)

**Primary Source:** Central Statistical Office (Központi Statisztikai Hivatal)
- ✅ **Authority:** Official Hungarian government geodata
- ⚠️ **Licensing:** Detailed commercial terms require direct contact
- ⚠️ **Access:** Public data available; partnership agreements recommended

**Usage:** Contact for data licensing agreement:
- KSH Geoinformation Services: https://www.ksh.hu/
- Focus on: Helyiségnamjegyzék (place name register), TSZJ (territorial coding system)

**Recommendation:** Use OpenStreetMap for MVP; contact KSH post-launch for official county boundary data if higher precision needed.

---

### 3. WikiData (CC0 License)

**POI & Landmark Data:**
- ✅ **Coverage:** Museums, theaters, historical sites, cultural venues across Hungary
- ✅ **License:** CC0 (public domain, no attribution required)
- ✅ **API:** SPARQL endpoint for queries

**Example SPARQL Query (Museums in Budapest):**
```sparql
SELECT ?item ?itemLabel ?location ?coordinate
WHERE {
  ?item wdt:P31 wd:Q33506 .           # instance of museum
  ?item wdt:P131 ?location .            # located in
  ?location wdt:P131 wd:Q1526 .         # recursively Budapest
  ?item wdt:P625 ?coordinate .          # coordinate location
  FILTER (?location = wd:Q1526 || ?location = wd:Q33559)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,hu" . }
}
LIMIT 1000
```

**In Database:**
```python
# Example: Import WikiData museums
import requests
import json
from datetime import datetime

SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
query = '''... (above SPARQL) ...'''

response = requests.get(SPARQL_ENDPOINT, params={'query': query, 'format': 'json'})
data = response.json()

for item in data['results']['bindings']:
    poi_data = {
        'name': item['itemLabel']['value'],
        'category': 'cultural_venue',
        'coordinates': item['coordinate']['value'],
        'source_url': item['item']['value'],
        'source_license': 'CC0',
        'attribution_required': False
    }
    db.insert('pois', poi_data)
```

---

### 4. kulturinfo.hu (CC-BY License)

**Hungarian Cultural Information System:**
- ✅ **Authority:** Official Hungarian cultural ministry
- ✅ **Coverage:** 500+ museums, galleries, cultural institutions
- ✅ **License:** CC-BY (attribution required)
- ✅ **API:** SPARQL endpoint available

**Endpoint:** https://kulturinfo.hu/sparql

**Example Query (All Venues):**
```sparql
SELECT ?venue ?name ?coordinate
WHERE {
  ?venue a <http://kulturinfo.hu/ontology#Venue> .
  ?venue <http://kulturinfo.hu/ontology#name> ?name .
  ?venue <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat .
  ?venue <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long .
  BIND(CONCAT(?lat, ",", ?long) as ?coordinate)
}
```

**Attribution Requirement:** Display "© kulturinfo.hu, licensed CC-BY" when showing data.

---

## Map Tiles & Layer Strategy

### Self-Hosted Tiles (Recommended for Production)

**TileServer GL Setup:**
```yaml
# docker-compose.yml excerpt
services:
  tileserver:
    image: maptiler/tileserver-gl:latest
    ports:
      - "8080:8080"
    volumes:
      - ./tiles:/data
    environment:
      - ENABLE_CORS=true
      - ALLOW_ORIGIN=*
    command: -c /data/config.json
```

**Benefits:**
- ✅ Full control over tile source
- ✅ Self-hosted cost (~$50/month compute)
- ✅ No vendor lock-in
- ✅ Guaranteed availability (no public server dependency)

**Setup:**
1. Download OpenStreetMap data (MBTiles format)
2. Convert to vector tiles (mbtiles-to-vector-tiles)
3. Serve via TileServer GL
4. Use TileServer GL in Leaflet: 
```javascript
L.tileLayer('https://yourdomain.com/data/osm/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
```

---

### Commercial Alternatives (If Self-Hosting Not Viable)

| Provider | Cost | Attribution | Rate Limit | SLA |
|----------|------|-------------|-----------|-----|
| **Thunderforest** | €125/month | Required | 50 req/s | 99.9% |
| **Mapbox** | €0-500+/month | Required | Tiered | 99.99% |
| **Google Maps** | $125+/month | Required | Varies | 99.99% |

**Recommendation:** Start with self-hosted TileServer GL; upgrade to paid if operational cost becomes bottleneck.

---

## PostGIS Spatial Queries

### Performance-Critical Queries

#### 1. Viewport POI Query (TARGET: <100ms)
```sql
-- Find all POIs in current map viewport
SELECT id, name, category, ST_AsGeoJSON(coordinates) as geom
FROM pois
WHERE ST_Intersects(coordinates, ST_MakeEnvelope(
  $1, $2, $3, $4,  -- west, south, east, north (BBOX)
  4326
))
AND category_id = $5  -- optional category filter
ORDER BY RANDOM()
LIMIT 500;

-- INDEX required:
CREATE INDEX idx_pois_geom_category ON pois 
  USING GIST(coordinates) 
  INCLUDE(category_id);
```

**Expected Performance:** With GIST index, bounding box intersect on 100k POIs = ~30-50ms (cached 5 min).

#### 2. Nearby POI Search (TARGET: <50ms)
```sql
-- Find restaurants within 5km of user location
SELECT id, name, rating, ST_Distance(
  coordinates, 
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
) as distance_m
FROM pois
WHERE category_id = $3  -- restaurant
  AND ST_DWithin(
    coordinates::geography,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    5000  -- 5km in meters
  )
ORDER BY distance_m
LIMIT 50;

-- INDEX required:
CREATE INDEX idx_pois_geog_dist ON pois 
  USING GIST(coordinates::geography);
```

**Expected Performance:** ~20-40ms for nearby queries with GIST index.

#### 3. County Boundary Point-in-Polygon (TARGET: <100ms)
```sql
-- Determine which county a coordinate falls within
SELECT id, name
FROM counties
WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
LIMIT 1;

-- INDEX required (automatic for boundary table):
CREATE INDEX idx_counties_geom ON counties USING GIST(geometry);
```

**Expected Performance:** ~10-20ms with GIST index on 19 counties.

### Spatial Index Strategy

**GIST (Generalized Search Tree):**
- ✅ Recommended for regional data (Hungary)
- ✅ Handles point, linestring, polygon efficiently
- ✅ Works with both `geometry` and `geography` types
- ✅ Typical query improvement: 10-100x faster

**BRIN (Block Range Index):**
- For large static datasets (historical archives)
- Not recommended for frequently updated POI/event data

**Composite Indexes:**
```sql
-- For queries that filter by category AND geography
CREATE INDEX idx_pois_category_geom ON pois(category_id)
  INCLUDE(id, name)
  USING GIST(coordinates);
```

---

## Map Rendering Strategy by Zoom Level

### Zoom-Dependent Data Fetching

```javascript
// Leaflet event: adjust query precision based on zoom
map.on('moveend', async () => {
  const zoom = map.getZoom();
  const bounds = map.getBounds();
  
  if (zoom < 10) {
    // County-level view: show county boundaries only
    fetchCounties();
  } else if (zoom < 13) {
    // District-level: show settlements + major POIs
    fetchSettlementsInBounds(bounds);
    fetchMajorPOIs(bounds, limit=100); // restaurants, hotels
  } else if (zoom < 16) {
    // Street-level: all POIs in viewport
    fetchAllPOIs(bounds, limit=500);
  } else {
    // Detail view: POIs + events + businesses
    fetchAllPOIs(bounds, limit=500);
    fetchEventsInBounds(bounds);
    fetchBusinessListings(bounds);
  }
});
```

### Clustering Strategy

**Leaflet.markercluster Plugin:**
```javascript
import L from 'leaflet';
import 'leaflet.markercluster';

const markerClusterGroup = L.markerClusterGroup({
  chunkedLoading: true,
  maxClusterRadius: 80, // pixels
  iconCreateFunction: customClusterIcon
});

// Add markers (50k+) without performance degradation
pois.forEach(poi => {
  const marker = L.marker([poi.lat, poi.lng]);
  marker.bindPopup(poi.name);
  markerClusterGroup.addLayer(marker);
});

map.addLayer(markerClusterGroup);
```

---

## Attribution & Data Source Tracking

### Database Schema for Attribution
```sql
CREATE TABLE poi_attributions (
    id SERIAL PRIMARY KEY,
    poi_id INTEGER REFERENCES pois(id),
    source_url TEXT,
    source_license VARCHAR(50), -- 'ODbL', 'CC0', 'CC-BY', 'CC-BY-SA'
    attribution_text TEXT, -- required attribution string
    last_verified_at TIMESTAMP,
    FOREIGN KEY(poi_id) REFERENCES pois(id)
);

-- Example: Multiple sources for same POI
INSERT INTO poi_attributions VALUES
  (NULL, 1, 'https://openstreetmap.org/node/1234', 'ODbL', 
   '© OpenStreetMap contributors', NOW()),
  (NULL, 1, 'https://wikidata.org/wiki/Q5678', 'CC0', 
   NULL, NOW()); -- CC0 requires no attribution
```

### Map Footer Attribution
```html
<!-- Always visible on map -->
<div class="map-attribution">
  <a href="https://www.openstreetmap.org/copyright">
    © OpenStreetMap contributors
  </a>
  <span>•</span>
  <a href="https://www.kulturinfo.hu/">
    CC-BY kulturinfo.hu
  </a>
  <span>•</span>
  <a href="https://www.wikidata.org/">
    CC0 Wikidata
  </a>
</div>
```

### POI Detail Attribution
```javascript
// Display sources when user views a POI
function showPOIDetails(poi) {
  const sources = await fetchAttributions(poi.id);
  
  let attrHTML = '<div class="poi-sources">';
  sources.forEach(source => {
    attrHTML += `<p>Data from: <a href="${source.source_url}">
      ${source.source_name}</a> (${source.source_license})`;
    if (source.attribution_text) {
      attrHTML += ` - ${source.attribution_text}`;
    }
    attrHTML += '</p>';
  });
  attrHTML += '</div>';
  
  return attrHTML;
}
```

---

## Tile Costs Analysis

### Self-Hosted (Recommended for MVP)
- **Initial cost:** ~$200 (MBTiles download, storage setup)
- **Monthly cost:** ~$50 (small compute instance)
- **Bandwidth:** Unlimited
- **Availability:** SLA depends on your infrastructure

### Public Tile Servers (NOT Recommended for Production)
- ❌ tile.openstreetmap.org has no SLA
- ❌ "Access may be withdrawn at any point"
- ❌ Bulk downloading prohibited
- ❌ Unsuitable for commercial platforms with paying customers

### Commercial Tile Services (If Scaling)
- **Thunderforest:** €125/month for 50k tiles/day
- **Mapbox:** €0-500/month depending on usage
- **Google Maps:** $125/month base + usage overages

**Cost Recommendation:** Start self-hosted (€600/year), scale to commercial only if tile server becomes operational bottleneck (unlikely).

---

## Conclusion

**Geographic data sources:**
- ✅ OpenStreetMap (ODbL) — County boundaries, base map
- ✅ WikiData (CC0) — Cultural venues, landmarks
- ✅ kulturinfo.hu (CC-BY) — Official cultural institutions

**Map tiles:**
- ✅ Self-hosted TileServer GL (€600/year, best for MVP)
- ⚠️ Commercial alternatives if needed for scale

**Spatial database:**
- ✅ PostGIS 3.6+ with GIST indexes
- ✅ Geometry type for regional queries (< 100ms target)
- ⚠️ Requires legal review for GPL v2 compliance

**Cost:** $0 data sources + €50/month compute = **€600-1200/year total.**

