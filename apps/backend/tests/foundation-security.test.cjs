const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('reflect-metadata');
const { GUARDS_METADATA } = require('@nestjs/common/constants');
const { AdminTokenGuard } = require('../dist/modules/auth/admin-token.guard.js');
const { AdminController } = require('../dist/modules/admin/admin.controller.js');
const { IngestionController } = require('../dist/modules/ingestion/ingestion.controller.js');
const { EventController } = require('../dist/modules/event/event.controller.js');
const { allowedCorsOrigins } = require('../dist/environment.config.js');

const secret = 'a'.repeat(64);
function guard(configuredToken) {
  return new AdminTokenGuard({ get: (name) => name === 'MOMAP_ADMIN_TOKEN' ? configuredToken : undefined });
}
function context(authorization) {
  return { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) };
}
function hasGuard(target) {
  return (Reflect.getMetadata(GUARDS_METADATA, target) || []).includes(AdminTokenGuard);
}
test('operator guard fails closed when the token is absent or weak', () => {
  for (const value of [undefined, '', 'short']) {
    assert.throws(() => guard(value).canActivate(context('Bearer ' + secret)), (error) => error.status === 503);
  }
});
test('operator guard rejects missing, malformed and invalid bearer credentials', () => {
  for (const header of [undefined, '', secret, 'Basic ' + secret, 'Bearer wrong', 'Bearer ' + 'b'.repeat(64)]) {
    assert.throws(() => guard(secret).canActivate(context(header)), (error) => error.status === 401);
  }
});
test('operator guard accepts the matching secret', () => {
  assert.equal(guard(secret).canActivate(context('Bearer ' + secret)), true);
});
test('admin, ingestion and every event mutating route have the guard', () => {
  assert.equal(hasGuard(AdminController), true);
  assert.equal(hasGuard(IngestionController), true);
  for (const method of ['create', 'update', 'cancel']) {
    assert.equal(hasGuard(EventController.prototype[method]), true, method);
  }
  for (const method of ['getAll', 'getById', 'getByViewport', 'getUpcoming']) {
    assert.equal(hasGuard(EventController.prototype[method]), false, method + ' must remain readable');
  }
});
test('CORS defaults to localhost in development and closed in production', () => {
  assert.deepEqual(allowedCorsOrigins(undefined, 'development'), [
    'http://localhost:4200', 'http://localhost:4201', 'http://localhost:3000',
  ]);
  assert.deepEqual(allowedCorsOrigins(undefined, 'production'), []);
  assert.deepEqual(allowedCorsOrigins('https://app.example.test, https://app.example.test', 'production'), [
    'https://app.example.test',
  ]);
  for (const invalid of ['file:///tmp', 'https://example.test/path', 'https://one.test,']) {
    assert.throws(() => allowedCorsOrigins(invalid, 'production'), /CORS_ORIGINS/);
  }
});
test('application module never enables TypeORM synchronize on startup', () => {
  const appModule = fs.readFileSync(path.resolve(__dirname, '../src/app.module.ts'), 'utf8');
  assert.match(appModule, /synchronize:\s*false/);
  assert.match(appModule, /migrationsRun:\s*false/);
});
