#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build', '.next']);
const MUTATORS = /\.(?:push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)\s*\(/;
const RAW_ROOT = /(?<![\w$.])(?:this|engine)\s*\.\s*state\b/g;
const PROPERTY_CHAIN = /(?:\s*(?:\?\.\s*|\.\s*)[A-Za-z_$][\w$]*|\s*\[[^\]\n]+\])+/g;
const ALIAS_DECL = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:this|engine)\s*\.\s*state\b/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function classify(line, end, expression) {
  const tail = line.slice(end);
  if (MUTATORS.test(expression) || /^\s*\.(?:push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)\s*\(/.test(tail)) return 'MUTATION';
  if (/^\s*(?:\+\+|--)/.test(tail) || /^\s*(?:[+\-*/%]?=(?!=|>))/.test(tail)) return 'WRITE';
  return 'READ';
}

function scan(file) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  const aliases = new Set();
  for (const line of lines) {
    ALIAS_DECL.lastIndex = 0;
    let match;
    while ((match = ALIAS_DECL.exec(line))) aliases.add(match[1]);
  }

  const findings = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\s*(?:\/\/|\*|\*\/)/.test(line)) continue;

    RAW_ROOT.lastIndex = 0;
    let rootMatch;
    while ((rootMatch = RAW_ROOT.exec(line))) {
      const rest = line.slice(rootMatch.index + rootMatch[0].length);
      PROPERTY_CHAIN.lastIndex = 0;
      const chain = PROPERTY_CHAIN.exec(rest)?.[0] ?? '';
      if (!chain) continue;
      const expression = rootMatch[0] + chain;
      findings.push({
        file: path.relative(ROOT, file),
        line: index + 1,
        access: classify(line, rootMatch.index + expression.length, expression),
        expression: expression.trim(),
        source: line.trim()
      });
    }

    for (const alias of aliases) {
      const aliasPattern = new RegExp('(?<![\\w$.])' + alias + '\\s*(?:\\?\\.\\s*|\\.\\s*)[A-Za-z_$][\\w$]*(?:\\s*(?:\\?\\.\\s*|\\.\\s*)[A-Za-z_$][\\w$]*|\\s*\\[[^\\]\\n]+\\])*', 'g');
      aliasPattern.lastIndex = 0;
      let match;
      while ((match = aliasPattern.exec(line))) {
        findings.push({
          file: path.relative(ROOT, file),
          line: index + 1,
          access: classify(line, match.index + match[0].length, match[0]),
          expression: match[0].trim(),
          source: line.trim(),
          alias: true
        });
      }
    }
  }
  return findings;
}

const files = walk(ROOT);
const findings = files.flatMap(scan).sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.expression.localeCompare(b.expression)
);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ scannedFiles: files.length, findings }, null, 2) + '\n');
} else {
  console.log('Direct runtime-state access candidates');
  console.log(`Scanned ${files.length} JavaScript files; found ${findings.length} candidates.\n`);
  for (const item of findings) {
    console.log(`[${item.access}] ${item.file}:${item.line}  ${item.expression}`);
  }
  console.log('\nReview each result: regex does not resolve symbols and may report false positives.');
}
