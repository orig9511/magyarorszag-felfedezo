#!/usr/bin/env node
/**
 * Imports Hungary's 19 counties + Budapest into the `counties` table.
 *
 * Source:  Lechner Knowledge Center, INSPIRE "Administrative Units" (2019 geometry), CC BY 4.0
 *          https://inspire.lechnerkozpont.hu/inspire/atom/DS_AdministrativeUnits.xml
 * Method:  download zip -> check SHA-256 -> shp2pgsql into a scratch table -> one transaction that
 *          validates, reprojects EOV (EPSG:23700) -> WGS84 (4326) and upserts by (source, sourceId).
 * Safety:  never deletes or truncates anything in app tables; `active` is never overwritten;
 *          any failed check rolls the whole upsert back.
 *
 * Usage:   node scripts/import-counties.mjs [--file <AdministrativeUnits.zip>] [--sha256 <hex>] [--verify]
 * Needs:   psql + shp2pgsql (both ship with PostgreSQL + the PostGIS bundle); DATABASE_URL in .env.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const SOURCE = 'lechner-inspire-au';
const ZIP_URL = 'https://inspire.lechnerkozpont.hu/inspire/atom/data/AdministrativeUnits.zip';
// SHA-256 of the file reviewed on 2026-10-11 (Last-Modified 2023-08-29, 5,812,217 bytes).
const EXPECTED_SHA256 = '8dc03a31b45a96d14297307800c467e535cf4c69bae38fe828af38d3e5d825cc';
const LICENSE = 'CC-BY-4.0';
const DISPLAY_TOLERANCE_DEG = 0.002; // simplification tolerance for displayGeometry
// Wording prescribed by the dataset's ISO metadata record for derived data. Replace "Momap" with
// the legal entity name + contact once it exists.
const ATTRIBUTION =
  'Based on geospatial data provided by Lechner Knowledge Center, modified by Momap ' +
  '(reprojected from EOV to WGS84, converted to MultiPolygon, county names and codes harmonised). ' +
  'Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).';

// shn (source id) -> [expected source name, ISO 3166-2 code, current Hungarian name, English name].
// ISO codes are from ISO 3166-2:HU. The 2019 source still says "Csongrád"; the county is now
// Csongrád-Csanád, so that one name is overridden on purpose.
const COUNTIES = {
  HU40200000000: ['Baranya', 'HU-BA', 'Baranya', 'Baranya'],
  HU50500000000: ['Borsod-Abaúj-Zemplén', 'HU-BZ', 'Borsod-Abaúj-Zemplén', 'Borsod-Abauj-Zemplen'],
  HU10100000000: ['Budapest', 'HU-BU', 'Budapest', 'Budapest'],
  HU70300000000: ['Bács-Kiskun', 'HU-BK', 'Bács-Kiskun', 'Bacs-Kiskun'],
  HU70400000000: ['Békés', 'HU-BE', 'Békés', 'Bekes'],
  HU70600000000: ['Csongrád', 'HU-CS', 'Csongrád-Csanád', 'Csongrad-Csanad'],
  HU20700000000: ['Fejér', 'HU-FE', 'Fejér', 'Fejer'],
  HU30800000000: ['Győr-Moson-Sopron', 'HU-GS', 'Győr-Moson-Sopron', 'Gyor-Moson-Sopron'],
  HU60900000000: ['Hajdú-Bihar', 'HU-HB', 'Hajdú-Bihar', 'Hajdu-Bihar'],
  HU51000000000: ['Heves', 'HU-HE', 'Heves', 'Heves'],
  HU61600000000: ['Jász-Nagykun-Szolnok', 'HU-JN', 'Jász-Nagykun-Szolnok', 'Jasz-Nagykun-Szolnok'],
  HU21100000000: ['Komárom-Esztergom', 'HU-KE', 'Komárom-Esztergom', 'Komarom-Esztergom'],
  HU51200000000: ['Nógrád', 'HU-NO', 'Nógrád', 'Nograd'],
  HU11300000000: ['Pest', 'HU-PE', 'Pest', 'Pest'],
  HU41400000000: ['Somogy', 'HU-SO', 'Somogy', 'Somogy'],
  HU61500000000: ['Szabolcs-Szatmár-Bereg', 'HU-SZ', 'Szabolcs-Szatmár-Bereg', 'Szabolcs-Szatmar-Bereg'],
  HU41700000000: ['Tolna', 'HU-TO', 'Tolna', 'Tolna'],
  HU31800000000: ['Vas', 'HU-VA', 'Vas', 'Vas'],
  HU21900000000: ['Veszprém', 'HU-VE', 'Veszprém', 'Veszprem'],
  HU32000000000: ['Zala', 'HU-ZA', 'Zala', 'Zala'],
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

// ---- configuration -------------------------------------------------------------------------
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = join(root, '.env');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return fail('DATABASE_URL is not set (environment or the repo-root .env).');
}

// Connection details go through PG* environment variables so the password never appears in argv.
function pgEnv() {
  const u = new URL(databaseUrl());
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    PGCLIENTENCODING: 'UTF8',
  };
}

function pgTool(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [process.env.PG_BIN && join(process.env.PG_BIN, exe), exe];
  if (process.platform === 'win32') {
    for (const v of [18, 17, 16, 15, 14]) candidates.push(`C:\\Program Files\\PostgreSQL\\${v}\\bin\\${exe}`);
  }
  for (const c of candidates.filter(Boolean)) {
    if (!spawnSync(c, ['--version'], { stdio: 'ignore' }).error) return c; // shp2pgsql has no --version (exits non-zero)
  }
  return fail(`Could not run ${name}. Add the PostgreSQL bin directory to PATH or set PG_BIN.`);
}

function psql(sql, extra = []) {
  const r = spawnSync(pgTool('psql'), ['-X', '-v', 'ON_ERROR_STOP=1', ...extra], {
    env: pgEnv(),
    input: sql,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  if (r.status !== 0) fail(`psql failed:\n${r.stderr || r.stdout}`);
  return r.stdout;
}

// ---- download + unzip (no third-party packages) ---------------------------------------------
async function getZip() {
  const local = opt('--file');
  let buf;
  if (local) {
    buf = readFileSync(resolve(local));
  } else {
    const cache = join(tmpdir(), 'momap-import');
    mkdirSync(cache, { recursive: true });
    const cached = join(cache, 'AdministrativeUnits.zip');
    console.log(`Downloading ${ZIP_URL}`);
    const res = await fetch(ZIP_URL);
    if (!res.ok) fail(`Download failed: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(cached, buf);
  }
  const expected = (opt('--sha256') ?? EXPECTED_SHA256).toLowerCase();
  const actual = createHash('sha256').update(buf).digest('hex');
  if (actual !== expected) {
    fail(
      `SHA-256 mismatch.\n  expected ${expected}\n  actual   ${actual}\n` +
        'The source file changed. Review the new release (licence, attributes, feature count), then ' +
        're-run with --sha256 <actual> and update EXPECTED_SHA256 in this script.',
    );
  }
  console.log(`SHA-256 verified (${actual.slice(0, 12)}…, ${buf.length} bytes)`);
  return buf;
}

function unzip(buf, wantedExt) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) fail('Not a zip file.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + elen + clen;
    if (!wantedExt.some((e) => name.toLowerCase().endsWith(e))) continue;
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(start, start + csize);
    files[name] = method === 0 ? data : inflateRawSync(data);
  }
  return files;
}

// ---- import -------------------------------------------------------------------------------
function stageShapefile(zip) {
  const files = unzip(zip, ['.shp', '.shx', '.dbf', '.prj', '.cpg']);
  const dir = join(tmpdir(), 'momap-import', 'AdministrativeUnits');
  mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) writeFileSync(join(dir, name), data);
  const shp = join(dir, 'AdministrativeUnits.shp');
  if (!existsSync(shp)) fail('AdministrativeUnits.shp not found in the zip.');

  const load = spawnSync(pgTool('shp2pgsql'), ['-c', '-D', '-s', '23700', '-g', 'geom', '-W', 'UTF-8', shp, 'import_staging.lechner_au'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  if (load.status !== 0) fail(`shp2pgsql failed:\n${load.stderr}`);
  psql('CREATE SCHEMA IF NOT EXISTS import_staging; DROP TABLE IF EXISTS import_staging.lechner_au;'); // scratch table only
  psql(load.stdout);
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

function importSql() {
  const rows = Object.entries(COUNTIES)
    .map(([shn, [src, code, name, en]]) => `(${[shn, src, code, name, en].map(lit).join(',')})`)
    .join(',\n    ');
  return `
BEGIN;

DO $$
BEGIN
  IF NOT (SELECT count(*) = 9 FROM information_schema.columns WHERE table_name = 'counties'
            AND column_name IN ('source','sourceId','license','attribution','sourceUpdatedAt','code','nameEn','geometry','displayGeometry')) THEN
    RAISE EXCEPTION 'counties table lacks the provenance columns: start the backend once in development (TypeORM synchronize) to create them';
  END IF;
END $$;

CREATE TEMP TABLE county_map (shn text PRIMARY KEY, src_name text, code text, name text, name_en text) ON COMMIT DROP;
INSERT INTO county_map VALUES
    ${rows};

-- Source must contain exactly the expected county units, with the expected names.
DO $$
DECLARE n int; bad int;
BEGIN
  SELECT count(*) INTO n FROM import_staging.lechner_au WHERE namespace = 'HU.AU.CY';
  IF n <> 20 THEN RAISE EXCEPTION 'expected 20 county units in source, found %', n; END IF;
  SELECT count(*) INTO bad FROM import_staging.lechner_au s
    LEFT JOIN county_map m ON m.shn = s.shn AND m.src_name = s.namn
    WHERE s.namespace = 'HU.AU.CY' AND m.shn IS NULL;
  IF bad > 0 THEN RAISE EXCEPTION '% source county units do not match the expected shn/name list', bad; END IF;
END $$;

CREATE TEMP TABLE county_import ON COMMIT DROP AS
SELECT m.shn, m.code, m.name, m.name_en,
       left(s.beginlifes, 10)::date AS source_updated,
       ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Transform(s.geom, 4326)), 3))::geometry(MultiPolygon, 4326) AS geom
FROM import_staging.lechner_au s JOIN county_map m ON m.shn = s.shn
WHERE s.namespace = 'HU.AU.CY';

-- Geometry validation: abort (and roll back) on anything suspicious.
DO $$
DECLARE bad int; area_km2 numeric;
BEGIN
  SELECT count(*) INTO bad FROM county_import
    WHERE geom IS NULL OR ST_IsEmpty(geom) OR NOT ST_IsValid(geom) OR ST_SRID(geom) <> 4326
       OR GeometryType(geom) <> 'MULTIPOLYGON'
       OR ST_XMin(geom) < 16 OR ST_XMax(geom) > 23 OR ST_YMin(geom) < 45.5 OR ST_YMax(geom) > 48.7;
  IF bad > 0 THEN RAISE EXCEPTION '% county geometries failed validation (validity/type/SRID/coordinate range)', bad; END IF;
  SELECT sum(ST_Area(geom::geography)) / 1e6 INTO area_km2 FROM county_import;
  IF area_km2 NOT BETWEEN 90000 AND 96000 THEN
    RAISE EXCEPTION 'total area % km2 is implausible for Hungary (~93,000 km2); check the reprojection', round(area_km2);
  END IF;
END $$;

WITH up AS (
  INSERT INTO counties (name, "nameEn", code, geometry, active, source, "sourceId", license, attribution, "sourceUpdatedAt")
  SELECT name, name_en, code, geom, false, ${lit(SOURCE)}, shn, ${lit(LICENSE)}, ${lit(ATTRIBUTION)}, source_updated
  FROM county_import
  ON CONFLICT (source, "sourceId") DO UPDATE
    SET name = EXCLUDED.name, "nameEn" = EXCLUDED."nameEn", code = EXCLUDED.code,
        geometry = EXCLUDED.geometry, license = EXCLUDED.license,
        attribution = EXCLUDED.attribution, "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt"
    WHERE md5(ST_AsEWKB(counties.geometry)) IS DISTINCT FROM md5(ST_AsEWKB(EXCLUDED.geometry))
       OR (counties.name, counties."nameEn", counties.code, counties.license, counties.attribution)
          IS DISTINCT FROM (EXCLUDED.name, EXCLUDED."nameEn", EXCLUDED.code, EXCLUDED.license, EXCLUDED.attribution)
  RETURNING (xmax = 0) AS inserted
)
SELECT count(*) FILTER (WHERE inserted) AS inserted, count(*) FILTER (WHERE NOT inserted) AS updated FROM up;

-- Simplified overview geometry (~${DISPLAY_TOLERANCE_DEG} deg, about 200 m). The whole coverage is simplified together so
-- neighbouring counties keep shared borders. The accurate "geometry" column is never modified here.
UPDATE counties c SET "displayGeometry" = s.g
FROM (
  SELECT id, ST_Multi(ST_CoverageSimplify(geometry, ${DISPLAY_TOLERANCE_DEG}) OVER ()) AS g
  FROM counties WHERE source = ${lit(SOURCE)}
) s
WHERE c.id = s.id;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM counties
    WHERE source = ${lit(SOURCE)}
      AND ("displayGeometry" IS NULL OR NOT ST_IsValid("displayGeometry") OR ST_SRID("displayGeometry") <> 4326
           OR GeometryType("displayGeometry") <> 'MULTIPOLYGON');
  IF bad > 0 THEN RAISE EXCEPTION '% simplified display geometries are missing or invalid', bad; END IF;
END $$;

COMMIT;
`;
}

function verify() {
  const out = psql(
    `\\pset format aligned
SELECT count(*) AS counties,
       count(*) FILTER (WHERE source = '${SOURCE}') AS from_source,
       count(*) FILTER (WHERE active) AS active,
       string_agg(DISTINCT GeometryType(geometry), ',') AS geom_types,
       string_agg(DISTINCT ST_SRID(geometry)::text, ',') AS srids,
       bool_and(ST_IsValid(geometry)) AS all_valid,
       round(sum(ST_Area(geometry::geography)) / 1e6) AS area_km2,
       sum(ST_NPoints(geometry)) AS full_points,
       sum(ST_NPoints("displayGeometry")) AS display_points
FROM counties;
SELECT code, name, active, ST_NPoints(geometry) AS points FROM counties WHERE source = '${SOURCE}' ORDER BY code;`,
  );
  console.log(out);
}

if (args.includes('--verify')) {
  verify();
} else {
  const zip = await getZip();
  stageShapefile(zip);
  const out = psql(importSql());
  console.log(out.trim().split('\n').filter((l) => /inserted|^\s*\d+\s*\|/.test(l)).join('\n'));
  psql('DROP TABLE IF EXISTS import_staging.lechner_au; DROP SCHEMA IF EXISTS import_staging;'); // scratch only
  verify();
}
