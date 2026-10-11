-- Migration 001: Create counties and POIs tables with PostGIS support

CREATE EXTENSION IF NOT EXISTS postgis;

-- Create counties table
CREATE TABLE counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index on counties
CREATE INDEX idx_counties_geometry ON counties USING GIST (geometry);

-- Create POIs table
CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  county_id UUID NOT NULL REFERENCES counties(id),
  address VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),
  image_url VARCHAR(500),
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  sponsored BOOLEAN DEFAULT false,
  owner_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index on POIs
CREATE INDEX idx_pois_location ON pois USING GIST (location);
CREATE INDEX idx_pois_county_id ON pois (county_id);
CREATE INDEX idx_pois_category ON pois (category);
CREATE INDEX idx_pois_source ON pois (source);

-- Trigger for updated_at
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pois_updated_at BEFORE UPDATE ON pois
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
