import { performance } from 'node:perf_hooks';
import { RigidBodyWorld3D } from '../../engine/modules/sprite/physics/3d/RigidBodyWorld.js';
const workloads=[
 {name:'sphere-sparse-100',dimension:'3D',count:100,collider:'sphere',spacing:4},
 {name:'box-sparse-100',dimension:'3D',count:100,collider:'box',spacing:4},
 {name:'sphere-dense-100',dimension:'3D',count:100,collider:'sphere',spacing:1},
 {name:'constrained-2d-100',dimension:'2D',plane:'XY',count:100,collider:'sphere',spacing:2},
];
for(const w of workloads){const world=new RigidBodyWorld3D({dimension:w.dimension,plane:w.plane||'XY',gravity:[0,0,0],fixedDt:1/120});for(let i=0;i<w.count;i++){const x=(i%10)*w.spacing,y=Math.floor(i/10)*w.spacing,z=w.dimension==='3D'?(i%7)*w.spacing:0;world.addBody({id:`b${String(i).padStart(4,'0')}`,type:i%12===0?'static':'dynamic',position:[x,y,z],collider:w.collider==='box'?{type:'box',halfExtents:[.5,.5,.5]}:{type:'sphere',radius:.5},velocity:i%12===0?[0,0,0]:[(i%5)-2,0,0]});}const t=performance.now();for(let i=0;i<120;i++)world.step();const elapsed=performance.now()-t;console.log(JSON.stringify({workload:w.name,bodies:w.count,ticks:120,wallMs:Number(elapsed.toFixed(3)),msPerTick:Number((elapsed/120).toFixed(4)),collisionEvents:world.events.filter(e=>e.type==='collision').length,dimension:w.dimension,collider:w.collider,algorithm:'deterministic all-pairs narrowphase; benchmark informational'}));}
