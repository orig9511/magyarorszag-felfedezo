# Event & POI Data Ingestion Strategy

## Approved Free Data Sources (All Commercial-Use Compliant)

### Primary Sources

| Source | License | Commercial Use | Attribution | Cost |
|--------|---------|---|---|---|
| **OpenStreetMap** | ODbL 1.0 | ✅ YES | ✅ Required | FREE |
| **Wikidata** | CC0 | ✅ YES | ⚠️ Optional | FREE |
| **kulturinfo.hu** | CC-BY | ✅ YES | ✅ Required | FREE |
| **Mobilizon Federation** | Varies | ✅ YES | ✅ Required | FREE |

**Total data cost: $0/month**

---

## Data Ingestion Architecture

### Worker-Based Crawling Pattern

```python
# tasks.py - Celery job queue
from celery import shared_task
import requests
from app.models import POI, Event
from datetime import datetime, timedelta

@shared_task
def crawl_osm_pois():
    """Fetch restaurants/attractions from OpenStreetMap"""
    overpass_query = """
    [bbox:45.74,16.11,48.58,22.90];
    (
      node["amenity"~"restaurant|cafe|pub"]["name"]({{bbox}});
      way["amenity"~"restaurant|cafe|pub"]["name"]({{bbox}});
    );
    out center;
    """
    
    response = requests.get('https://overpass-api.de/api/interpreter',
                           data=overpass_query, timeout=60)
    
    for item in response.json()['elements']:
        poi_data = {
            'name': item['tags'].get('name'),
            'category': 'restaurant',
            'coordinates': (item['center']['lat'], item['center']['lon']),
            'source_url': f"https://osm.org/{item['type']}/{item['id']}",
            'source_license': 'ODbL',
            'attribution_required': True
        }
        POI.upsert(poi_data)

@shared_task
def crawl_wikidata_venues():
    """Fetch cultural venues from Wikidata"""
    sparql_query = '''
    SELECT ?item ?name ?lat ?long {
      ?item wdt:P31 wd:Q33506 .  -- instance of museum
      ?item wdt:P131* wd:Q28 .   -- located in Hungary
      ?item wdt:P625 ?coords .
      BIND(xsd:decimal(geoutils:latitude(?coords)) as ?lat)
      BIND(xsd:decimal(geoutils:longitude(?coords)) as ?long)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,hu" }
    }
    '''
    
    response = requests.get('https://query.wikidata.org/sparql',
                           params={'query': sparql_query, 'format': 'json'})
    
    for result in response.json()['results']['bindings']:
        poi_data = {
            'name': result['name']['value'],
            'category': 'museum',
            'coordinates': (float(result['lat']['value']), float(result['long']['value'])),
            'source_url': result['item']['value'],
            'source_license': 'CC0',
            'attribution_required': False
        }
        POI.upsert(poi_data)

@shared_task
def crawl_mobilizon_events():
    """Fetch events from Mobilizon federation via ActivityPub"""
    # Mobilizon instances expose events via AP collection endpoint
    instances = ['mobilizon.hu', 'mobilizon.fr']  # Hungarian + European instances
    
    for instance in instances:
        try:
            response = requests.get(
                f'https://{instance}/events',
                headers={'Accept': 'application/activity+json'},
                timeout=10
            )
            
            if response.status_code == 200:
                for item in response.json()['orderedItems']:
                    event_data = {
                        'title': item.get('name'),
                        'description': item.get('summary'),
                        'venue_name': item.get('location', {}).get('name'),
                        'coordinates': (
                            item.get('location', {}).get('latitude'),
                            item.get('location', {}).get('longitude')
                        ),
                        'start_time': item.get('startTime'),
                        'end_time': item.get('endTime'),
                        'source_url': item.get('url'),
                        'source_license': 'Varies',
                        'confidence_score': 0.9
                    }
                    Event.upsert(event_data)
        except requests.RequestException as e:
            print(f"Failed to fetch from {instance}: {e}")

# Schedule tasks
from celery.schedules import crontab

app.conf.beat_schedule = {
    'crawl-osm-pois': {
        'task': 'tasks.crawl_osm_pois',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'crawl-wikidata': {
        'task': 'tasks.crawl_wikidata_venues',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'crawl-mobilizon': {
        'task': 'tasks.crawl_mobilizon_events',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
}
```

---

## Deduplication Engine

### Fuzzy Matching + Spatial Clustering

```python
from fuzzywuzzy import fuzz
import numpy as np
from sklearn.cluster import DBSCAN

def find_duplicates(category: str, threshold: float = 0.85):
    """Find likely duplicate POIs within category"""
    pois = POI.query.filter_by(category=category).all()
    
    # Fuzzy name matching
    duplicates = []
    for i, poi1 in enumerate(pois):
        for poi2 in pois[i+1:]:
            # String similarity
            name_sim = fuzz.ratio(poi1.name.lower(), poi2.name.lower()) / 100
            
            # Spatial distance
            from math import radians, cos, sin, asin, sqrt
            lat1, lon1 = poi1.coordinates
            lat2, lon2 = poi2.coordinates
            
            # Haversine formula
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            distance_km = 6371 * c
            
            # Combined score: high name similarity + close proximity = duplicate
            if name_sim > threshold and distance_km < 0.5:
                duplicates.append({
                    'poi1_id': poi1.id,
                    'poi2_id': poi2.id,
                    'name_similarity': name_sim,
                    'distance_km': distance_km,
                    'confidence': min(0.99, name_sim * 0.7 + (1 - distance_km/1.0) * 0.3)
                })
    
    return duplicates

def merge_duplicate_pois(poi1_id: int, poi2_id: int):
    """Merge two POIs, keeping highest quality data"""
    poi1 = POI.query.get(poi1_id)
    poi2 = POI.query.get(poi2_id)
    
    # Keep POI with most recent verification
    if poi2.updated_at > poi1.updated_at:
        poi1, poi2 = poi2, poi1
    
    # Merge attribution sources
    for source in poi2.attributions:
        if source not in poi1.attributions:
            poi1.attributions.append(source)
    
    # Keep highest rating
    if poi2.rating and poi2.rating > (poi1.rating or 0):
        poi1.rating = poi2.rating
    
    # Mark duplicate for removal
    poi2.is_duplicate_of = poi1.id
    db.session.commit()
```

---

## Event Lifecycle Management

### Automatic Staleness Detection

```python
@shared_task
def validate_events():
    """Check events for cancellation/expiration"""
    from datetime import datetime, timedelta
    
    # Events ending more than 30 days ago
    old_events = Event.query.filter(
        Event.end_time < datetime.now() - timedelta(days=30)
    ).all()
    
    for event in old_events:
        event.marked_as_stale = True
        
        # Try to verify if still active
        response = requests.head(event.source_url, timeout=5)
        if response.status_code == 404:
            event.canceled = True  # Source no longer available
    
    db.session.commit()
```

---

## GDPR Compliance Implementation

### User Data Export Endpoint

```python
# backend/modules/gdpr/gdpr.controller.ts
@Post('/gdpr/export')
async exportUserData(@Req() req, @Res() res) {
    const user = req.user;
    
    // Collect all user data
    const userData = {
        profile: await this.userService.get(user.id),
        favorites: await this.favoriteService.find({user_id: user.id}),
        flags: await this.flagService.find({user_id: user.id}),
        audit_log: await this.auditLogService.find({user_id: user.id}),
    };
    
    // Return as downloadable JSON
    res.set('Content-Type', 'application/json');
    res.set('Content-Disposition', 'attachment; filename="momap_export.json"');
    res.send(JSON.stringify(userData, null, 2));
}

@Delete('/gdpr/erasure/request')
async requestErasure(@Req() req) {
    const user = req.user;
    
    // Create erasure request (requires confirmation via email)
    const token = crypto.randomBytes(32).toString('hex');
    await this.erasureService.create({
        user_id: user.id,
        token,
        requested_at: new Date(),
        status: 'pending'
    });
    
    // Send confirmation email
    await this.emailService.sendErasureConfirmation(user.email, token);
    
    return {message: 'Confirmation email sent. Click link to complete erasure.'};
}

@Delete('/gdpr/erasure/:token')
async confirmErasure(@Param('token') token) {
    const request = await this.erasureService.findByToken(token);
    
    if (!request || request.status !== 'pending') {
        throw new BadRequestException('Invalid or expired token');
    }
    
    // Delete all user data
    await this.userService.delete(request.user_id);
    
    request.status = 'completed';
    request.completed_at = new Date();
    await request.save();
    
    return {message: 'Your account and all data have been deleted.'};
}
```

### Audit Logging for Compliance

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),  -- 'export_request', 'erasure_request', 'poi_view', etc
    entity_type VARCHAR(50),
    entity_id INTEGER,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Log all POI views (for analytics without personal tracking)
INSERT INTO audit_log (user_id, action, entity_type, entity_id, timestamp)
VALUES ($1, 'poi_view', 'poi', $2, NOW());

-- Log all data exports (for GDPR compliance)
INSERT INTO audit_log (user_id, action, entity_type, timestamp)
VALUES ($1, 'data_export', 'user', NOW());
```

---

## Data Freshness Monitoring

```python
@shared_task
def monitor_data_freshness():
    """Report on freshness of data sources"""
    from datetime import datetime, timedelta
    
    report = {
        'osm_pois': {
            'last_updated': POI.query.filter_by(source_license='ODbL').order_by(
                POI.updated_at.desc()).first().updated_at,
            'count': POI.query.filter_by(source_license='ODbL').count(),
            'age_days': (datetime.now() - last_updated).days
        },
        'events': {
            'upcoming': Event.query.filter(Event.start_time > datetime.now()).count(),
            'last_check': Event.query.order_by(Event.updated_at.desc()).first().updated_at,
        }
    }
    
    # Alert if no updates in 7 days
    for source, data in report.items():
        if data['age_days'] > 7:
            alert(f"Warning: {source} has not been updated in {data['age_days']} days")
    
    return report
```

---

## Data Retention & Removal Policy

```sql
-- Events older than 1 year from end date are marked stale
DELETE FROM events
WHERE end_time < NOW() - INTERVAL '1 year'
  AND canceled = false;

-- Old POI versions (keep 3 most recent)
DELETE FROM poi_versions
WHERE poi_id = $1
  AND version < (
    SELECT MAX(version) FROM poi_versions WHERE poi_id = $1
  ) - 3;

-- Audit logs older than 3 years (GDPR minimum retention)
DELETE FROM audit_log
WHERE timestamp < NOW() - INTERVAL '3 years';
```

---

## Summary

**Zero-cost data ingestion pipeline:**
- Free approved sources (OSM, Wikidata, kulturinfo.hu, Mobilizon)
- Automated daily crawlers (Python/Celery)
- Deduplication engine (fuzzy matching + spatial)
- GDPR-compliant erasure system
- Audit logging for compliance
- Event lifecycle management (staleness, cancellation)

**Operational cost:** €0/month (all sources free)  
**Development effort:** 3-4 weeks for full implementation  
**Maintenance burden:** ~4 hours/month for crawler monitoring

