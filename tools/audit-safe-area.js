#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const foundation='src/design-system/foundations/base.css';
const required=['top','right','bottom','left'];
const errors=[];
const cssFiles=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()&& !['.git','node_modules','dist','build','coverage'].includes(entry.name))walk(path.join(dir,entry.name));
    else if(entry.isFile()&&entry.name.endsWith('.css'))cssFiles.push(path.relative(root,path.join(dir,entry.name)).replaceAll(path.sep,'/'));
  }
}
walk(path.join(root,'src'));
const foundationText=fs.readFileSync(path.join(root,foundation),'utf8');
for(const side of required){
  const token=new RegExp('--vsr-safe-area-'+side+'\\s*:\\s*env\\(safe-area-inset-'+side+'\\s*,\\s*0px\\s*\\)');
  if(!token.test(foundationText))errors.push('Foundation is missing canonical token for '+side);
}
for(const file of cssFiles){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  if(file!==foundation&&/env\\(\\s*safe-area-inset-(?:top|right|bottom|left)/i.test(source))errors.push('Direct safe-area env() usage outside Foundation: '+file);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!/name=["']viewport["'][^>]*viewport-fit\\s*=\\s*cover/i.test(html))errors.push('index.html viewport meta must include viewport-fit=cover');
if(errors.length){for(const error of errors)console.error('FAIL '+error);process.exitCode=1;}
else console.log('Safe Area audit passed: four canonical Foundation tokens, no direct feature env() usage, viewport-fit=cover present.');
