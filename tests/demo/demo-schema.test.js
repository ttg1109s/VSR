import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import { scenarioSchema } from '../engine/scenario/ScenarioSchema.js';
import { DEMO_SCRIPT } from '../demo-script-data.js';

test('demo JSON conforms to the canonical scenario JSON Schema', () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(scenarioSchema);
  const valid = validate(DEMO_SCRIPT);
  assert.equal(valid, true, validate.errors?.map(error => `${error.instancePath} ${error.message}`).join('\n'));
});
