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
    } else if (entry.isFile() && entry.name.endsWith('.js')) out.push(path.join(dir, entry.name));
  }
  return out;
}

function propertyName(node) {
  if (!node?.computed && node?.property?.type === 'Identifier') return node.property.name;
  if (node?.computed && node.property?.type === 'Literal') return String(node.property.value);
  return node?.computed ? '[computed]' : '';
}

function isRawStateRoot(node) {
  return node?.type === 'MemberExpression' &&
    propertyName(node) === 'state' &&
    (node.object?.type === 'ThisExpression' ||
      (node.object?.type === 'Identifier' && node.object.name === 'engine'));
}

function children(node) {
  const out = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) for (const item of value) if (item?.type) out.push(item);
    else if (value?.type) out.push(value);
  }
  return out;
}

function analyze(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });
  const aliases = new Set();
  const parents = new WeakMap();

  function index(node, parent = null) {
    if (parent) parents.set(node, parent);
    for (const child of children(node)) index(child, node);
  }
  index(ast);

  function collectAliases(node) {
    if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier' && isRawStateRoot(node.init)) {
      aliases.add(node.id.name);
    }
    for (const child of children(node)) collectAliases(child);
  }
  collectAliases(ast);

  function rootOf(node) {
    let current = node;
    while (current?.type === 'MemberExpression') current = current.object;
    if (isRawStateRoot(current)) return { kind: 'direct', root: current };
    if (current?.type === 'Identifier' && aliases.has(current.name)) return { kind: 'alias', root: current };
    return null;
  }

  function chainOf(node) {
    const parts = [];
    let current = node;
    while (current?.type === 'MemberExpression') {
      const name = propertyName(current);
      parts.unshift(name.startsWith('[') ? name : current.computed ? `[${name}]` : name);
      current = current.object;
    }
    if (isRawStateRoot(current)) return [current.object.type === 'ThisExpression' ? 'this.state' : 'engine.state', ...parts].join('.');
    if (current?.type === 'Identifier' && aliases.has(current.name)) return [current.name, ...parts].join('.');
    return '';
  }

  const findings = [];
  function visit(node) {
    if (node.type === 'MemberExpression') {
      const parent = parents.get(node);
      const outermost = !(parent?.type === 'MemberExpression' && parent.object === node);
      if (outermost) {
        const root = rootOf(node);
        if (root) {
          let access = 'READ';
          if (parent?.type === 'AssignmentExpression' && parent.left === node) access = 'WRITE';
          else if (parent?.type === 'UpdateExpression' && parent.argument === node) access = 'WRITE';
          else if (parent?.type === 'CallExpression' && parent.callee === node && MUTATORS.has(propertyName(node))) access = 'MUTATION';
          findings.push({
            file: path.relative(ROOT, file),
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            access,
            expression: chainOf(node),
            alias: root.kind === 'alias'
          });
        }
      }
    } else if (node.type === 'VariableDeclarator' && node.id?.type === 'ObjectPattern' && isRawStateRoot(node.init)) {
      findings.push({
        file: path.relative(ROOT, file),
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        access: 'READ',
        expression: 'destructuring from Engine state',
        alias: false
      });
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
const counts = findings.reduce((result, item) => {
  result[item.access] = (result[item.access] || 0) + 1;
  return result;
}, {});

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ scannedFiles: files.length, findings, counts }, null, 2) + '\\n');
} else {
  console.log('AST runtime-state access audit');
  console.log(`Scanned ${files.length} JavaScript files; found ${findings.length} candidates.`);
  console.log(`Classification: READ=${counts.READ || 0}, WRITE=${counts.WRITE || 0}, MUTATION=${counts.MUTATION || 0}.\\n`);
  for (const item of findings) {
    console.log(`[${item.access}]${item.alias ? '[ALIAS]' : ''} ${item.file}:${item.line}:${item.column}  ${item.expression}`);
  }
}
