#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const IGNORE=new Set(['.git','node_modules','dist','build','coverage','.next']);
const errors=[];
const files=[];
const htmlFiles=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()){if(!IGNORE.has(entry.name))walk(path.join(dir,entry.name));}
    else if(entry.isFile()&&/\.(js|jsx|mjs|cjs|css)$/.test(entry.name))
      files.push(path.relative(ROOT,path.join(dir,entry.name)).replaceAll(path.sep,'/'));
    else if(entry.isFile()&&entry.name.endsWith('.html'))
      htmlFiles.push(path.relative(ROOT,path.join(dir,entry.name)).replaceAll(path.sep,'/'));
  }
}
walk(ROOT);
const sourceFiles=new Set(files);

for(const file of files.filter(p=>p.startsWith('src/pages/')&&/\.(jsx?|tsx?)$/.test(p))){
  const content=fs.readFileSync(path.join(ROOT,file),'utf8');
  const stylesheetImports=[...content.matchAll(/(?:import\s+(?:[^'"]+\s+from\s+)?|import\s*\()\s*['"]([^'"]+\.css)['"]/g)].map(match=>match[1]);
  const allowedOwnedStyles=file==='src/pages/playing/PlayingPage.jsx' && stylesheetImports.length===1 && stylesheetImports[0]==='../../features/playing/playing-page.css';
  if(stylesheetImports.length && !allowedOwnedStyles)
    errors.push(`Page imports a stylesheet outside its approved component-owned styling boundary: ${file}`);
  if(/\bstyle\s*=\s*\{/.test(content))
    errors.push(`Page defines inline presentation: ${file}`);
}
function resolveImport(from,specifier){
  const cleanSpecifier=specifier.split(/[?#]/,1)[0];
  if(!cleanSpecifier.startsWith('.'))return null;
  const base=path.normalize(path.join(path.dirname(from),cleanSpecifier));
  const candidates=[base,...['.js','.jsx','.mjs','.cjs','.json','.css','.svg','.png','.jpg','.jpeg','.webp'].map(ext=>base+ext),...['index.js','index.jsx','index.css'].map(name=>path.join(base,name))];
  return candidates.find(candidate=>sourceFiles.has(candidate))||null;
}
const reachable=new Set();
function visit(file){
  if(reachable.has(file)||!sourceFiles.has(file))return;
  reachable.add(file);
  const content=fs.readFileSync(path.join(ROOT,file),'utf8');
  const imports=[...content.matchAll(/(?:\bimport\s+(?:[^'"]*?\sfrom\s*)?|\bexport\s+[^'"]*?\sfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
  imports.push(...[...content.matchAll(/new URL\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]));
  if(file.endsWith('.css'))imports.push(...[...content.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(m=>m[1]));
  for(const specifier of imports){const target=resolveImport(file,specifier);if(target)visit(target);}
}
const roots=new Set(['src/main.jsx','engine/engine.worker.js','server/index.js','protocol/index.js','vite.config.js','playwright.config.js','client/adapters/HttpJsonTransport.js','tests/browser/overlay-fixture.jsx']);
for(const file of files){
  if(file.startsWith('tests/')&&/\.(test|spec)\.js$/.test(file))roots.add(file);
  if(file.startsWith('tools/')&&file.endsWith('.js'))roots.add(file);
}
try{
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  if(typeof pkg.main==='string')roots.add(pkg.main.replace(/^\.\//,''));
  for(const target of Object.values(pkg.exports||{})){
    if(typeof target==='string')roots.add(target.replace(/^\.\//,''));
  }
}catch(error){errors.push('Unable to read package.json exports: '+error.message);}
for(const root of roots)visit(root);
// Browser fixtures are launched by HTML module entry points rather than JS imports.
for(const htmlFile of htmlFiles){
  const content=fs.readFileSync(path.join(ROOT,htmlFile),'utf8');
  const moduleSources=[...content.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/gi)].map(match=>match[1]);
  for(const specifier of moduleSources){const target=resolveImport(htmlFile,specifier);if(target)visit(target);}
}
const unreachable=files.filter(file=>/\.(js|jsx|mjs|cjs|css)$/.test(file)&&!reachable.has(file));
if(process.argv.includes('--deadcode')&&unreachable.length){
  for(const file of unreachable)console.error(`Unreachable source candidate (manual review required): ${file}`);
}

for(const error of errors)console.error(error);
if(errors.length){console.error(`UI architecture audit failed: ${errors.length} violation(s).`);process.exitCode=1;}
else console.log(`UI architecture audit passed: ${files.length} files scanned; page styling boundaries are clean.`);
if(process.argv.includes('--deadcode')){
  console.log(`Repository static import graph: ${reachable.size} reachable files from app/runtime/test/tool/package entry points; ${unreachable.length} unreachable candidate(s).`);
  if(unreachable.length)process.exitCode=1;
}
