// Run after `npm run build -w apps/backend`. No DB connection, bootstrap, HTTP or scheduler.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { Event } = require('../dist/modules/event/event.entity');
const { EventImportService } = require('../dist/modules/event/event-import.service');
const { TicketmasterAdapter } = require('../dist/modules/ingestion/adapters/ticketmaster.adapter');

test('adapter genre and import metadata survive normalization and TypeORM entity creation', async t => {
  const adapter = new TicketmasterAdapter({ get: () => undefined });
  const raw = adapter.normalizeEvent({
    id: 'fixture-genre', name: 'Synthetic import contract fixture', url: 'https://example.invalid/event',
    dates: { start: { dateTime: '2030-01-01T18:00:00Z' }, timezone: 'Europe/Budapest' },
    classifications: [{ segment: { name: 'Music' }, genre: { name: 'Jazz' } }],
    _embedded: { venues: [{ name: 'Synthetic venue', city: { name: 'Synthetic settlement' }, location: { latitude: '47', longitude: '19' } }] },
  });
  assert.equal(raw.eventType, 'Jazz');
  const dataSource = new DataSource({ type: 'postgres', entities: [Event] });
  await dataSource.buildMetadatas(); // Builds decorators/column mapping only; never initialize/connect.
  assert.equal(dataSource.isInitialized, false);
  const repository = dataSource.getRepository(Event);
  const saved = [];
  const service = new EventImportService({
    findOne: async () => null,
    create: data => repository.create(data),
    save: async entity => { saved.push(entity); return entity; },
  }, { resolveCountyId: async () => '00000000-0000-4000-8000-000000000001' });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'momap-import-contract-'));
  const fixture = path.join(dir, 'fixture.json');
  t.after(async () => { await fs.unlink(fixture); await fs.rmdir(dir); });
  await fs.writeFile(fixture, JSON.stringify([raw]), 'utf8');
  const result = await service.importFromFile({ filePath: fixture, format: 'json', source: 'synthetic-fixture' });
  assert.equal(result.failed, 0, result.errors.join('\n'));
  assert.equal(result.created, 1);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].eventType, 'Jazz');
  assert.equal(saved[0].timezone, 'Europe/Budapest');
  assert.equal(saved[0].officialEventUrl, raw.officialEventUrl);
  assert.equal(saved[0].ticketUrl, raw.ticketUrl);
  assert.ok(saved[0].lastCheckedAt instanceof Date);
  assert.equal(saved[0].isTestData, false);
  const metadata = dataSource.getMetadata(Event);
  for (const name of ['eventType', 'timezone', 'officialEventUrl', 'ticketUrl', 'lastCheckedAt', 'isTestData']) {
    assert.ok(metadata.columns.some(column => column.propertyName === name), `${name} must be persisted, not only declared`);
  }
});
