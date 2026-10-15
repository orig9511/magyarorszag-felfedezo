const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { ConfigModule } = require('@nestjs/config');
const ConnectionParameters = require('pg/lib/connection-parameters');
const compiled = path.resolve(__dirname, '../dist/environment.config.js');
const { requireDatabaseUrl } = require(compiled);

function fixtureConfig(root) {
  // Execute the real compiled path resolver at a virtual installed location, with no files or secrets.
  const filename = path.join(root, 'apps/backend/dist/environment.config.js');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod._compile(fs.readFileSync(compiled, 'utf8'), filename);
  return mod.exports;
}
test('environment paths resolve repository-root and backend-local files independently of cwd', () => {
  const root = path.resolve('synthetic-project');
  const config = fixtureConfig(root);
  assert.deepEqual(config.environmentFiles, [path.join(root,'apps/backend/.env'),path.join(root,'.env')]);
});
test('Nest fallback provides a string password, and a backend-local file takes precedence', () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'momap-env-test-'));
  const backend = path.join(root, 'apps/backend');
  fs.mkdirSync(backend, {recursive:true});
  const rootFile = path.join(root,'.env'), localFile = path.join(backend,'.env');
  try {
    fs.writeFileSync(rootFile, 'DATABASE_URL=postgresql://fixture:synthetic-password@localhost:15433/fixturedb\n');
    const config = fixtureConfig(root);
    const fallback = ConfigModule.loadEnvFile(config.environmentFiles, {});
    const connection = new ConnectionParameters({connectionString:requireDatabaseUrl(fallback.DATABASE_URL)});
    assert.equal(typeof connection.password,'string'); assert.ok(connection.password.length>0); assert.equal(connection.port,15433);
    fs.writeFileSync(localFile, 'DATABASE_URL=postgresql://fixture:synthetic-override@localhost:15434/fixturedb\n');
    const override = ConfigModule.loadEnvFile(config.environmentFiles, {});
    assert.equal(new ConnectionParameters({connectionString:override.DATABASE_URL}).port,15434);
  } finally {
    if(fs.existsSync(localFile)) fs.unlinkSync(localFile);
    if(fs.existsSync(rootFile)) fs.unlinkSync(rootFile);
    fs.rmdirSync(backend); fs.rmdirSync(path.join(root,'apps')); fs.rmdirSync(root);
  }
});
test('missing URL fails before the driver can fall back to passwordless localhost', () => {
  for (const value of [undefined, null, '', '   ', 42]) assert.throws(() => requireDatabaseUrl(value), /DATABASE_URL is required/);
});
test('invalid URL errors never echo the supplied credential', () => {
  const secret = 'synthetic-secret';
  for (const value of [`invalid ${secret}`, `https://user:${secret}@example.invalid/db`]) {
    assert.throws(() => requireDatabaseUrl(value), error => error.message.includes('DATABASE_URL') && !error.message.includes(secret));
  }
  const url = `postgresql://user:${secret}@127.0.0.1:5433/db`;
  assert.equal(requireDatabaseUrl(url), url);
});
