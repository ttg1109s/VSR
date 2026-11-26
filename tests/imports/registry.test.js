import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getModuleUrl,
  importModule,
  importModules,
  listModuleKeys,
  validateModuleRegistry
} from './index.js';

test('registry contains only resolvable Engine module URLs', async () => {
  const result = await validateModuleRegistry();
  assert.equal(result.valid, true, JSON.stringify(result.missing, null, 2));
  assert.ok(result.checked > 0);
});

test('registry exposes stable unique keys', () => {
  const keys = listModuleKeys();
  assert.ok(keys.length > 0);
  assert.equal(new Set(keys).size, keys.length);
  assert.match(getModuleUrl('Scenario'), /\/engine\/schema\/scenario\.js$/);
});

test('unknown keys fail with an actionable error', async () => {
  assert.throws(() => getModuleUrl('NotRegistered'), /Unknown module key: "NotRegistered"/);
  await assert.rejects(importModule('NotRegistered'), /Unknown module key: "NotRegistered"/);
});

test('single and batch imports share the cached module namespace', async () => {
  const single = await importModule('TaskManager');
  const batch = await importModules(['TaskManager', 'Scenario']);
  assert.strictEqual(batch.TaskManager, single);
  assert.equal(typeof batch.Scenario.normalizeScenario, 'function');
});


test('JSON schema modules are imported through the registry with the correct module type', async () => {
  const schemaModule = await importModule('ScenarioSchema');
  assert.equal(typeof schemaModule.default, 'object');
  assert.equal(schemaModule.default.$schema, 'http://json-schema.org/draft-07/schema#');
});
