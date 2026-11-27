/** Conservative deterministic broadphase for 3D rigid bodies.
 * Bounds use shape bounding spheres and swept center segments. Planes, unknown
 * geometry, and bodies whose geometry is sampled/animated route through fallback.
 */
const v3=(v)=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v:[0,0,0];
const add=(a,b)=>a.map((x,i)=>x+b[i]),length=v=>Math.hypot(...v);
function bodyBoundRadius(body){const c=body.collider,off=length(v3(c?.offset));if(!c)return null;
 if(c.type==='sphere'&&Number.isFinite(c.radius)&&c.radius>0)return c.radius+off;
 if(c.type==='ellipsoid'&&Array.isArray(c.radii)&&c.radii.every(x=>Number.isFinite(x)&&x>0))return length(c.radii)+off;
 if(c.type==='box'&&Array.isArray(c.halfExtents)&&c.halfExtents.every(x=>Number.isFinite(x)&&x>0))return length(c.halfExtents)+off;
 if(c.type==='plane'&&Array.isArray(c.normal)&&c.normal.every(Number.isFinite)&&Number.isFinite(c.offset))return Infinity;return null;}
function sweptBounds(body,dt){const r=bodyBoundRadius(body);if(r===null||body.physicalStateSampler)return null;const p=v3(body.position),moving=(body.type==='dynamic'&&body.awake)||body.type==='kinematic',end=moving?add(p,body.velocity.map(x=>x*dt)):p;return{min:p.map((x,i)=>Math.min(x,end[i])-r),max:p.map((x,i)=>Math.max(x,end[i])+r),plane:r===Infinity};}
function overlaps(a,b){return a.min.every((x,i)=>x<=b.max[i]&&a.max[i]>=b.min[i]);}
function pairKey(a,b){return a<b?a+'\u0000'+b:b+'\u0000'+a;}
export function buildSweptBroadphasePairs(bodies,{dt=0,cellSize=4,maxCellsPerBody=2048}={}){if(!Number.isFinite(dt)||dt<0||!Number.isFinite(cellSize)||cellSize<=0||!Number.isSafeInteger(maxCellsPerBody)||maxCellsPerBody<1)throw new TypeError('Invalid broadphase configuration');
 const list=[...bodies.values()].sort((a,b)=>a.id.localeCompare(b.id)),bounds=new Map(),fallback=new Set(),planes=new Set(),buckets=new Map(),oversized=new Set();
 for(const b of list){const box=sweptBounds(b,dt);if(!box){fallback.add(b.id);continue;}if(box.plane){planes.add(b.id);continue;}bounds.set(b.id,box);const lo=box.min.map(x=>Math.floor(x/cellSize)),hi=box.max.map(x=>Math.floor(x/cellSize)),count=(hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)*(hi[2]-lo[2]+1);if(!Number.isFinite(count)||count>maxCellsPerBody){oversized.add(b.id);continue;}for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const k=x+','+y+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(b.id);}}
 const pairs=new Map(),addPair=(a,b)=>{if(a===b)return;const A=bodies.get(a),B=bodies.get(b);if(!A||!B||!A.collisionEnabled||!B.collisionEnabled||(A.type==='static'&&B.type==='static'))return;pairs.set(pairKey(a,b),[a,b].sort());};
 for(const bucket of buckets.values())for(let i=0;i<bucket.length;i++)for(let j=i+1;j<bucket.length;j++)addPair(bucket[i],bucket[j]);
 const ids=list.map(b=>b.id);for(const id of [...fallback,...oversized,...planes])for(const other of ids)addPair(id,other);
 return [...pairs.values()].filter(([a,b])=>fallback.has(a)||fallback.has(b)||planes.has(a)||planes.has(b)||oversized.has(a)||oversized.has(b)||overlaps(bounds.get(a),bounds.get(b))).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));}
export const SweptBroadphase3D={bodyBoundRadius,sweptBounds};
