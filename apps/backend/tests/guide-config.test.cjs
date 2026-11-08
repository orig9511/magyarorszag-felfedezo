const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateGuideConfig, toPublicGuideView } = require('../dist/modules/guides/guide-config.js');
const org = '11111111-1111-4111-8111-111111111111';
const poi = '22222222-2222-4222-8222-222222222222';
const event = '33333333-3333-4333-8333-333333333333';
const valid = () => ({
  slug: 'hotel-debrecen', organizationId: org,
  branding: { title: 'Hotel Debrecen', accentColor: '#C6F05A', logoUrl: 'https://example.org/logo.png' },
  map: { center: [21.625, 47.531], zoom: 12 },
  categories: ['attraction', 'restaurant'], poiIds: [poi], eventIds: [event], published: true,
});
test('validates and normalizes a guide without mutating the input', () => {
  const input = valid();
  const result = validateGuideConfig(input);
  assert.equal(result.branding.accentColor, '#c6f05a');
  assert.equal(input.branding.accentColor, '#C6F05A');
});
test('rejects malformed slugs, tenant IDs and unexpected fields', () => {
  for (const patch of [{slug:'../other'}, {slug:'Hotel'}, {organizationId:'not-a-uuid'}, {evil:true}]) {
    assert.throws(() => validateGuideConfig({...valid(), ...patch}));
  }
});
test('rejects unsafe logo URLs and invalid coordinates', () => {
  for (const logoUrl of ['javascript:alert(1)', 'http://example.org/x', 'https://user:pass@example.org/x']) {
    assert.throws(() => validateGuideConfig({...valid(),branding:{...valid().branding,logoUrl}}));
  }
  for (const center of [[181, 47], [21, 91], [NaN, 47], [21], [21, 47, 1]]) {
    assert.throws(() => validateGuideConfig({...valid(),map:{center,zoom:10}}));
  }
});
test('rejects duplicates and non-UUID POI/event IDs', () => {
  assert.throws(() => validateGuideConfig({...valid(),poiIds:[poi,poi]}));
  assert.throws(() => validateGuideConfig({...valid(),eventIds:['not-an-id']}));
});
test('never projects an unpublished guide or leaks organizationId', () => {
  const cfg = validateGuideConfig(valid());
  const view = toPublicGuideView(cfg);
  assert.equal(view.slug, cfg.slug);
  assert.equal(Object.hasOwn(view,'organizationId'), false);
  assert.equal(Object.hasOwn(view,'published'), false);
  assert.throws(() => toPublicGuideView(validateGuideConfig({...valid(),published:false})));
});
test('public projection does not share mutable collections', () => {
  const cfg = validateGuideConfig(valid());
  const view = toPublicGuideView(cfg);
  view.poiIds.pop();
  view.map.center[0] = 0;
  assert.equal(cfg.poiIds.length, 1);
  assert.equal(cfg.map.center[0], 21.625);
});
