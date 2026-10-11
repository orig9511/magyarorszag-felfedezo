# Momap — Magyarország Felfedezője

Premium map-first tourism and local discovery platform for Hungary.

## Development Setup

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/orig9511/magyarorszag-felfedezo.git
   cd magyarorszag-felfedezo
   ```

2. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start the development environment with Docker Compose:**
   ```bash
   docker-compose up
   ```

   This will start:
   - PostgreSQL with PostGIS (port 5432)
   - NestJS backend API (port 3000)
   - Angular frontend (port 4200)

4. **Access the application:**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000
   - PostgreSQL: localhost:5432

### Local Installation (without Docker)

If you prefer to run services locally:

1. **Backend:**
   ```bash
   cd apps/backend
   npm install
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

3. **Database:**
   - Install PostgreSQL 15+ with PostGIS extension
   - Create database: `createdb momap`
   - Load schema: `psql -d momap < apps/backend/src/migrations/001_init.sql`

### Project Structure

```
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (POI, County)
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   └── package.json
│   └── frontend/         # Angular application
│       ├── src/
│       │   ├── app/
│       │   ├── index.html
│       │   └── main.ts
│       └── package.json
├── docs/
│   └── research/         # Audit documentation
├── docker-compose.yml
├── package.json          # Root package with workspaces
└── README.md
```

### API Endpoints

#### Counties
- `GET /api/counties` — List all counties
- `GET /api/counties/:id` — Get county details
- `GET /api/counties/:id/geometry` — Get county geometry (GeoJSON)

#### Points of Interest (POIs)
- `GET /api/pois/viewport?minLat=X&maxLat=Y&minLng=A&maxLng=B&categories=C&countyId=D` — Get POIs in viewport
- `GET /api/pois/:id` — Get POI details

### Database Schema

**Counties Table:**
- `id` (UUID, primary key)
- `name` (varchar, Hungarian name)
- `name_en` (varchar, English name)
- `code` (varchar, ISO 3166-2 code)
- `geometry` (MultiPolygon, 4326 SRID)
- `active` (boolean)
- `source`, `sourceId`, `license`, `attribution`, `sourceUpdatedAt` (provenance of the boundary; unique on `source` + `sourceId`)
- `created_at` (timestamp)

**POIs Table:**
- `id` (UUID, primary key)
- `name` (varchar)
- `description` (text)
- `category` (varchar: attraction, restaurant, accommodation, event, etc.)
- `location` (Point, 4326 SRID)
- `county_id` (UUID, foreign key)
- `address`, `phone`, `website`, `image_url`
- `source` (varchar: osm, wikidata, lechner, etc.)
- `source_id` (varchar, external ID)
- `sponsored` (boolean)
- `owner_id` (UUID, optional)
- `created_at`, `updated_at` (timestamp)

### Importing county boundaries

Loads the 19 counties + Budapest from Lechner's INSPIRE Administrative Units (CC BY 4.0, 2019 geometry)
into the existing local PostgreSQL/PostGIS database. No Docker needed.

```bash
# 1. Start the backend once in development so TypeORM creates the provenance columns, then stop it.
# 2. Make sure DATABASE_URL is set in the root .env, and psql + shp2pgsql are available
#    (they ship with PostgreSQL + the PostGIS bundle; otherwise set PG_BIN to the bin directory).
npm run import:counties            # download, verify SHA-256, validate, upsert in one transaction
npm run import:counties -- --verify   # only print counts, geometry types, SRID, validity
```

- Safe to re-run: rows are matched on (`source`, `sourceId`) and updated only when something changed.
  Nothing is deleted, `active` is never overwritten, and a failed check rolls everything back.
- New counties are inserted **inactive**. Activate one explicitly, e.g.
  `UPDATE counties SET active = true WHERE code = 'HU-HB';`
- The source dates from 2019. The Csongrád name is corrected to Csongrád-Csanád in the script; other
  post-2019 changes may be missing.
- Anything that displays or redistributes these boundaries must show the `attribution` text stored on the rows.
  Replace "Momap" in the script's `ATTRIBUTION` constant with the legal entity name once it exists.
- `GET /api/counties` currently returns full-resolution geometry (~0.9 MB for all 20); a simplified layer is still to do.

### Development Workflow

1. **Make changes** to backend or frontend code
2. **Backend changes** auto-reload via `npm run dev` (NestJS with watch mode)
3. **Frontend changes** auto-reload in the browser via Angular dev server
4. **Database schema changes** require migration files in `apps/backend/src/migrations/`

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for a specific app
npm run test -w apps/backend
npm run test -w apps/frontend
```

### Linting

```bash
# Lint all apps
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Building for Production

```bash
npm run build
```

This builds both the backend and frontend for production deployment.

### Key Technologies

- **Frontend:** Angular 17, MapLibre GL JS, TypeScript
- **Backend:** NestJS, TypeORM, PostgreSQL
- **Database:** PostgreSQL 17 with PostGIS extension
- **Deployment:** Docker Compose (development), production-ready setup TBD
- **CMS:** Directus (for editorial content, planned for Phase 2)

### Geographic Data

- **County Boundaries:** Lechner INSPIRE dataset (CC BY 4.0), with OSM cross-reference
- **POIs:** OpenStreetMap, Wikidata, official tourism APIs (Debrecen, Budapest focus)
- **Tiles:** MapLibre GL JS, self-hosted Protomaps (preferred) or Stadia/MapTiler fallback

### Data Attribution

- OpenStreetMap contributors (ODbL)
- Lechner Knowledge Centre (CC BY 4.0)
- Wikidata contributors (CC0)

### Roadmap

- **Phase 1 (MVP):** Debrecen/Hajdú-Bihar county, basic POI display, category filters
- **Phase 2:** Budapest, Directus CMS integration, event ingestion
- **Phase 3:** Remaining counties, advanced filtering, user submissions
- **Phase 4:** Monetization (business accounts, sponsored listings)

### Common Issues

**Database connection error:**
```bash
# Ensure PostgreSQL is running and accessible
docker-compose logs postgres
```

**Frontend not connecting to backend:**
- Check that the backend API is running on port 3000
- Verify CORS configuration in `apps/backend/src/main.ts`
- Check proxy config in `apps/frontend/proxy.conf.json`

**Port already in use:**
```bash
# Change port in docker-compose.yml or stop conflicting services
docker-compose ps
docker stop <container-id>
```

### Contributing

See `CLAUDE.md` for architecture and development guidelines.

### License

This project is proprietary and closed-source.

---

**Status:** Initial implementation (Phase 1 MVP) — Debrecen/Hajdú-Bihar edition
