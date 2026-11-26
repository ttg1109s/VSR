export const add = (a,b)=>a.map((v,i)=>v+(b[i]??0));
export const sub = (a,b)=>a.map((v,i)=>v-(b[i]??0));
export const scale = (a,s)=>a.map(v=>v*s);
export const dot = (a,b)=>a.reduce((sum,v,i)=>sum+v*(b[i]??0),0);
export const length = a=>Math.sqrt(dot(a,a));
export const normalize = a=>{const n=length(a); return n>1e-12?scale(a,1/n):[1,0,0];};
export const lerp = (a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function validateVector(v,name='vector') { if(!Array.isArray(v)||v.length<2||v.length>3||v.some(x=>typeof x!=='number'||!Number.isFinite(x))) throw new TypeError(`${name} must be a finite 2D or 3D vector.`); return [...v,...Array(3-v.length).fill(0)]; }
