import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const demoSchemaTest = 'demo-schema.test.js';
const forbidden = /demo-script-data\.js|demo_script\.js|demo_script\.json|\bDEMO_SCRIPT\b|\bgetDemoScenario\b|\bLocalEngineHost\b/;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith('.test.js') ? [path] : [];
  });
}

function resolveModule(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(from), specifier);
  const candidates = [base, base + '.js', base + '.mjs', base + '.json', join(base, 'index.js')];
  return candidates.find(candidate => {
    try { return readFileSync(candidate, 'utf8') !== undefined; } catch { return false; }
  }) || null;
}

function importedModules(file) {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/(?:\bimport\s+(?:[^'"]*?\sfrom\s*)?|\bexport\s+[^'"]*?\sfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)]
    .map(match => match[1]);
}

function reachableFiles(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of importedModules(file)) {
      const resolved = resolveModule(file, specifier);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

test('Engine tests do not depend on Demo scenario data directly or transitively', () => {
  const violations = walk(root)
    .filter(path => !path.endsWith(demoSchemaTest) && !path.endsWith('test-boundaries.test.js'))
    .flatMap(path => {
      const source = readFileSync(path, 'utf8');
      const directReference = forbidden.test(source);
      const transitiveDemoImport = [...reachableFiles(path)].some(modulePath =>
        ['demo-script-data.js', 'demo_script.js', 'demo_script.json'].includes(basename(modulePath))
      );
      return directReference || transitiveDemoImport ? [path.replace(root, 'tests/')] : [];
    });
  assert.deepEqual(violations, [], 'Demo references are forbidden in Engine tests');
});
