import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const demoSchemaTest = 'demo/demo-schema.test.js';
const forbidden = /demo-script-data\.js|demo_script\.js|\bDEMO_SCRIPT\b/;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith('.test.js') ? [path] : [];
  });
}

test('Engine tests do not depend on Demo scenario data', () => {
  const violations = walk(root)
    .filter(path => !path.endsWith(demoSchemaTest) && !path.endsWith('test-boundaries.test.js'))
    .flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return forbidden.test(source) ? [path.replace(root, 'tests/')] : [];
    });
  assert.deepEqual(violations, [], 'Demo references are forbidden in Engine tests');
});
