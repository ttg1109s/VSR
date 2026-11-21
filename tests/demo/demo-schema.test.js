import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import { scenarioSchema } from '../../engine/scenario/ScenarioSchema.js';
import { DEMO_SCRIPT } from '../../demo-script-data.js';

test('canonical scenario schema is valid JSON Schema Draft-07', () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  assert.equal(
    ajv.validateSchema(scenarioSchema),
    true,
    ajv.errors?.map(error => `${error.instancePath} ${error.message}`).join('\n')
  );
});

test('demo scenario data is valid JSON syntax', () => {
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(DEMO_SCRIPT)));
});
