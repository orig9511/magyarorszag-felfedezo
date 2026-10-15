# Data Ingestion Module

The Ingestion module handles automated data collection, normalization, validation, and database synchronization for events and POIs from multiple sources.

## Architecture

### Core Components

1. **Ingestion Service** (`ingestion.service.ts`)
   - Orchestrates data fetch, validation, deduplication, and database operations
   - Tracks ingestion jobs and their results
   - Handles error aggregation and partial failures gracefully

2. **Data Adapters** (interfaces and implementations)
   - `DataAdapter`: Generic interface for data sources
   - `OSMAdapter`: OpenStreetMap POI data via Overpass API
   - `WikidataAdapter`: Cultural POIs via SPARQL endpoint
   - Extensible for future sources (organizer APIs, partner feeds)

3. **Ingestion Scheduler** (`ingestion.scheduler.ts`)
   - Runs scheduled jobs using `@nestjs/schedule`
   - OSM: Daily at 2 AM UTC
   - Wikidata: Weekly on Sundays at 3 AM UTC

4. **Ingestion Controller** (`ingestion.controller.ts`)
   - Manual ingestion trigger: `POST /api/ingestion/run?source=osm`
   - Job history query: `GET /api/ingestion/history?source=osm&limit=10`

### Data Models

- **Event Entity** (`event.entity.ts`)
  - Title, description, category, start/end times
  - Location (Point geometry), venue, performers
  - Source tracking: `source`, `sourceId`, `sourceUrl`, `licenseType`, `attribution`
  - Status: `active`, `cancelled`, `postponed`, `draft`
  - Sponsorship and owner tracking

- **IngestionJob Entity** (`ingestion-job.entity.ts`)
  - Tracks each ingestion run's progress and results
  - Counts: processed, created, updated, skipped, failed
  - Error summary and log URL for debugging

### Data Flow

```
┌─────────────────────┐
│  Data Source        │
│ (OSM, Wikidata)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ DataAdapter.fetch() │  — Timeout, rate-limit handling
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ Validation + Normalization │  — Convert to RawEventData/RawPOIData
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Deduplication & Settlement   │
│ County Resolution            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Insert/Update DB             │
│ Track via IngestionJob       │
└──────────┬───────────────────┘
           │
           ▼
┌────────────────┐
│ Result Summary │
└────────────────┘
```

## License Compliance

### OpenStreetMap (ODbL 1.0)

- **Status:** `source='osm_overpass'` for POIs
- **Rule:** Kept separate from proprietary/editorial data (no merge without legal review)
- **Attribution:** "OpenStreetMap contributors"
- **Source URL:** `https://www.openstreetmap.org/node/{osm_id}`

### Wikidata (CC0)

- **Status:** `source='wikidata'` for cultural POIs
- **Rule:** May be merged freely; provenance tracked via `sourceId` (Q-id)
- **Attribution:** "Wikidata contributors"
- **Source URL:** `https://www.wikidata.org/wiki/{qid}`

### Events (Partner/Editorial)

- **Status:** `source='organizer'`, `source='editorial'`, etc.
- **Rule:** Track agreement reference, scope, `retrieved_at`
- **Moderation:** Events may require approval before display

## TODO & Future Work

1. **Settlement-County Mapping**
   - Currently uses simple string matching; needs dedicated `settlements` table
   - Fuzzy matching for typos/variations

2. **Geofabrik Extract Processing**
   - Replace Overpass API with local Geofabrik file processing
   - Periodic downloads + processing for batch OSM updates

3. **Partner Integrations**
   - visitdebrecen.com (requires written agreement)
   - debreceniprogramok.com (de facto event calendar)
   - CMS integration for editorial event submission

4. **Deduplication Engine**
   - PostGIS `ST_DWithin` + trigram similarity for fuzzy POI matching
   - Cross-source duplicate detection (OSM vs. Wikidata)

5. **Moderation Workflow**
   - Admin dashboard for event approval
   - Image curation and license verification
   - Event cancellation/postponement handling

6. **Performance Optimization**
   - Batch ingestion jobs for large datasets
   - Connection pooling, retry strategies
   - Incremental sync (only fetch changed records)

## Testing & Debugging

### Manual Ingestion

```bash
# Run OSM ingestion immediately
curl -X POST http://localhost:3000/api/ingestion/run?source=osm

# Run Wikidata ingestion
curl -X POST http://localhost:3000/api/ingestion/run?source=wikidata

# View job history
curl http://localhost:3000/api/ingestion/history?source=osm&limit=5
```

### Logs & Monitoring

- NestJS logs include adapter-level progress and errors
- IngestionJob records in database track totals and error summaries
- `errorSummary` field contains first 100 error messages (JSON)

## Configuration

Environment variables (`.env`):

```
DATABASE_URL=postgresql://user:pass@postgres:5432/momap
NODE_ENV=development
```

Scheduled jobs are hardcoded in `IngestionScheduler`; modify cron times as needed.
