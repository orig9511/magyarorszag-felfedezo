const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.resolve(__dirname, '../src/migrations/proposals/003_momap_guides.sql'), 'utf8');

test('proposed guide schema is transactional and additive', () => {
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+pois|ALTER\s+TABLE\s+events)\b/i);
});
test('organizations, memberships and guides have explicit ownership and roles', () => {
  for (const table of ['momap_organizations','momap_organization_memberships','momap_guides']) {
    assert.match(sql, new RegExp('CREATE TABLE IF NOT EXISTS ' + table));
  }
  assert.match(sql, /role IN \('owner', 'editor', 'viewer'\)/);
  assert.match(sql, /organization_id uuid NOT NULL REFERENCES momap_organizations\(id\)/);
  assert.match(sql, /slug varchar\(80\) NOT NULL UNIQUE/);
  assert.match(sql, /published boolean NOT NULL DEFAULT false/);
});
test('curated POIs and events are linked, not copied or re-owned', () => {
  assert.match(sql, /REFERENCES pois\(id\)/);
  assert.match(sql, /REFERENCES events\(id\)/);
  assert.match(sql, /PRIMARY KEY \(guide_id, poi_id\)/);
  assert.match(sql, /PRIMARY KEY \(guide_id, event_id\)/);
});
