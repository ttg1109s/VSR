#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build', '.next']);
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && /\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out;
}

function propertyName(node) {
  if (!node?.computed && node?.property?.type === 'Identifier') return node.property.name;
  if (node?.computed && node.property?.type === 'Literal') return String(node.property.value);
  return node?.computed ? '[computed]' : '';
}

function isStateRoot(node) {
  return node?.type === 'MemberExpression' && propertyName(node) === 'state' &&
    (node.object?.type === 'ThisExpression' || node.object?.type === 'Identifier' && node.object.name === 'engine');
}

function children(node) {
  const result = [];
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) result.push(...value.filter(item => item?.type));
    else if (value?.type) result.push(value);
  }
  return result;
}

function analyze(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });
  const parents = new WeakMap();
  const aliases = new Map();

  function index(node, parent = null) {
    if (parent) parents.set(node, parent);
    for (const child of children(node)) index(child, node);
  }
  index(ast);

  // Fixed-point alias propagation catches transitive aliases and aliases declared
  // before the alias source. Destructuring and parameter aliases are classified too.
  function collectAlias(node) {
    if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') {
      const init = node.init;
      if (isStateRoot(init)) aliases.set(node.id.name, 'engine.state');
      else if (init?.type === 'Identifier' && aliases.has(init.name)) aliases.set(node.id.name, aliases.get(init.name));
      else if (init?.type === 'MemberExpression') {
        const root = rootOf(init);
        if (root) aliases.set(node.id.name, root.expression);
      }
    }
    for (const child of children(node)) collectAlias(child);
  }
  function rootOf(node) {
    let current = node;
    const parts = [];
    while (current?.type === 'MemberExpression') {
      const prop = propertyName(current);
      parts.unshift(current.computed ? `[${prop}]` : prop);
      if (isStateRoot(current)) return { expression: ['engine.state', ...parts.slice(1)].join('.'), root: current };
      current = current.object;
    }
    if (current?.type === 'Identifier' && aliases.has(current.name)) {
      return { expression: [aliases.get(current.name), ...parts].join('.'), root: current };
    }
    return null;
  }

  for (let pass = 0; pass < 8; pass++) collectAlias(ast);

  const findings = [];
  function visit(node) {
    if (node.type === 'VariableDeclarator' && node.id?.type === 'ObjectPattern') {
      const root = rootOf(node.init);
      if (root) findings.push({ file: path.relative(ROOT, file), line: node.loc.start.line, column: node.loc.start.column + 1,
        access: 'READ', expression: 'destructuring from Engine state', alias: true });
    }

    if (node.type === 'MemberExpression') {
      const parent = parents.get(node);
      const outermost = !(parent?.type === 'MemberExpression' && parent.object === node);
      if (outermost) {
        const root = rootOf(node);
        if (root) {
          let access = 'READ';
          if (parent?.type === 'AssignmentExpression' && parent.left === node) access = 'WRITE';
          else if (parent?.type === 'UpdateExpression' && parent.argument === node) access = 'WRITE';
          else if (parent?.type === 'UnaryExpression' && parent.operator === 'delete') access = 'DELETE';
          else if (parent?.type === 'CallExpression' && parent.callee === node && MUTATORS.has(propertyName(node))) access = 'MUTATION';
          findings.push({ file: path.relative(ROOT, file), line: node.loc.start.line, column: node.loc.start.column + 1,
            access, expression: root.expression, alias: root.expression.startsWith('engine.state') === false });
        }
      }
    }
    for (const child of children(node)) visit(child);
  }
  visit(ast);
  return findings;
}

const files = walk(ROOT);
const findings = files.flatMap(analyze).sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column
);

function isAllowed(item) {
  if (item.file === 'state/StateAccess.js') return true;
  if (item.file === 'engine/GameEngine.js') return item.access === 'WRITE';
  if (item.file === 'engine/persistence/SaveState.js' || item.file === 'protocol/JsonProtocol.js') return item.access === 'READ';
  if (item.file.startsWith('tests/')) return item.access === 'READ';
  return false;
}

const strict = process.argv.includes('--strict');
const violations = findings.filter(item => !isAllowed(item));
const counts = findings.reduce((result, item) => {
  result[item.access] = (result[item.access] || 0) + 1;
  return result;
}, {});

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ scannedFiles: files.length, findings, counts, violations: violations.length }, null, 2) + '\\n');
} else {
  console.log('AST runtime-state access audit');
  console.log(`Scanned ${files.length} JavaScript files; found ${findings.length} candidates.`);
  console.log(`Classification: READ=${counts.READ || 0}, WRITE=${counts.WRITE || 0}, DELETE=${counts.DELETE || 0}, MUTATION=${counts.MUTATION || 0}.\\n`);
  for (const item of findings) {
    const marker = strict && !isAllowed(item) ? ' [VIOLATION]' : '';
    console.log(`[${item.access}]${item.alias ? '[ALIAS]' : ''}${marker} ${item.file}:${item.line}:${item.column}  ${item.expression}`);
  }
  if (strict) {
    console.log(`\\nStrict allowlist: ${findings.length - violations.length} allowed; ${violations.length} violations.`);
    if (violations.length) process.exitCode = 1;
  }
}
