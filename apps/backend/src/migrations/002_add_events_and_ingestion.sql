-- Migration 002: Add events and ingestion job tracking tables

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  venue VARCHAR(255),
  location GEOMETRY(Point, 4326),
  county_id UUID NOT NULL REFERENCES counties(id),
  settlement VARCHAR(255) NOT NULL,
  performers TEXT,
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  source_url VARCHAR(500),
  license_type VARCHAR(50),
  attribution TEXT,
  status VARCHAR(20) DEFAULT 'active',
  status_changed_at TIMESTAMP,
  sponsored BOOLEAN DEFAULT false,
  owner_id UUID,
  retrieved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, source_id)
);

-- Create spatial index on events location
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_events_county_id ON events (county_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);

-- Trigger for events updated_at
CREATE TRIGGER IF NOT EXISTS update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create ingestion_jobs table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_adapter VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  run_started_at TIMESTAMP,
  run_completed_at TIMESTAMP,
  items_processed INTEGER,
  items_created INTEGER,
  items_updated INTEGER,
  items_skipped INTEGER,
  items_failed INTEGER,
  error_summary TEXT,
  raw_log_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on ingestion_jobs
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_source_adapter ON ingestion_jobs (source_adapter);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_run_started_at ON ingestion_jobs (run_started_at DESC);

-- Trigger for ingestion_jobs updated_at
CREATE TRIGGER IF NOT EXISTS update_ingestion_jobs_updated_at BEFORE UPDATE ON ingestion_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
