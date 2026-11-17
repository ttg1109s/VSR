#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const SRC=path.join(ROOT,'src');
const IGNORE=new Set(['node_modules','dist','build','coverage']);
const errors=[];
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()){if(!IGNORE.has(entry.name))walk(path.join(dir,entry.name));}
    else if(entry.isFile())files.push(path.relative(ROOT,path.join(dir,entry.name)).replaceAll(path.sep,'/'));
  }
}
walk(SRC);
const sourceFiles=new Set(files);
for(const file of files.filter(p=>p.startsWith('src/pages/')&&/\.(jsx?|tsx?)$/.test(p))){
  const content=fs.readFileSync(path.join(ROOT,file),'utf8');
  if(/(?:import\s+(?:[^'"]+\s+from\s+)?|import\s*\()\s*['"][^'"]+\.css['"]/.test(content))
    errors.push(`Page imports a stylesheet: ${file}`);
  if(/\bstyle\s*=\s*\{/.test(content))
    errors.push(`Page defines inline presentation: ${file}`);
}
function resolveImport(from,specifier){
  if(!specifier.startsWith('.'))return null;
  const base=path.normalize(path.join(path.dirname(from),specifier));
  const candidates=[base,...['.js','.jsx','.mjs','.json','.css','.svg','.png','.jpg','.jpeg','.webp'].map(ext=>base+ext),...['index.js','index.jsx','index.css'].map(name=>path.join(base,name))];
  return candidates.find(candidate=>sourceFiles.has(candidate))||null;
}
const reachable=new Set();
function visit(file){
  if(reachable.has(file)||!sourceFiles.has(file))return;
  reachable.add(file);
  const content=fs.readFileSync(path.join(ROOT,file),'utf8');
  const imports=[...content.matchAll(/(?:\bimport\s+(?:[^'"]*?\sfrom\s*)?|\bexport\s+[^'"]*?\sfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
  if(file.endsWith('.css'))imports.push(...[...content.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(m=>m[1]));
  for(const specifier of imports){const target=resolveImport(file,specifier);if(target)visit(target);}
}
visit('src/main.jsx');
const unreachable=files.filter(file=>/\.(jsx?|css)$/.test(file)&&!reachable.has(file));
if(process.argv.includes('--deadcode')&&unreachable.length){
  for(const file of unreachable)console.error(`Unreachable source candidate (manual review required): ${file}`);
}
for(const error of errors)console.error(error);
if(errors.length){console.error(`UI architecture audit failed: ${errors.length} violation(s).`);process.exitCode=1;}
else console.log(`UI architecture audit passed: ${files.length} files scanned; page styling boundaries are clean.`);
if(process.argv.includes('--deadcode')){
  console.log(`Static import graph: ${reachable.size} reachable source files; ${unreachable.length} unreachable candidate(s).`);
  if(unreachable.length)process.exitCode=1;
}
