import { importModules } from './imports/index.js';
const __testModules = await importModules(["TaskManager"]);
const { TaskManager } = __testModules.TaskManager;

import test from 'node:test';
import assert from 'node:assert/strict';

class FakeClock {
 constructor(){this.time=0;this.nextId=0;this.timers=new Map();}
 now=()=>this.time;
 setTimeout=(callback,delay)=>{
  const id=++this.nextId;
  this.timers.set(id,{at:this.time+delay,callback});
  return id;
 };
 clearTimeout=(id)=>{this.timers.delete(id);};
 async advance(ms){
  const target=this.time+ms;
  while(true){
   const next=[...this.timers.entries()].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next)break;
   const [id,timer]=next;
   this.timers.delete(id);
   this.time=timer.at;
   timer.callback();
   await Promise.resolve();
   await Promise.resolve();
  }
  this.time=target;
  await Promise.resolve();
 }
}

test('once runs exactly once and removes itself from the task plan',async()=>{
 const clock=new FakeClock();
 const manager=new TaskManager({},120,{clock});
 let calls=0;
 const task=manager.once(()=>{calls++;},25);
 assert.equal(manager.plan[task.name]?.isRunning,true);
 await clock.advance(24);
 assert.equal(calls,0);
 await clock.advance(1);
 assert.equal(calls,1);
 assert.equal(manager.plan[task.name],undefined);
 assert.equal(manager.running[task.name],undefined);
});

test('unnamed once tasks receive independent generated names',async()=>{
 const clock=new FakeClock();
 const manager=new TaskManager({},120,{clock});
 const calls=[];
 const first=manager.once(()=>calls.push('first'),10);
 const second=manager.once(()=>calls.push('second'),10);
 assert.notEqual(first.name,second.name);
 await clock.advance(10);
 assert.deepEqual(calls,['first','second']);
 assert.equal(Object.keys(manager.plan).length,0);
});

test('a repeated stable name replaces the previous task (debounce)',async()=>{
 const clock=new FakeClock();
 const manager=new TaskManager({},120,{clock});
 const calls=[];
 manager.once(()=>calls.push('old'),10,'debounced');
 await clock.advance(5);
 manager.once(()=>calls.push('new'),10,'debounced');
 await clock.advance(9);
 assert.deepEqual(calls,[]);
 await clock.advance(1);
 assert.deepEqual(calls,['new']);
 assert.equal(manager.plan.debounced,undefined);
});

test('a stale handle cannot cancel a newer task that reused its name',async()=>{
 const clock=new FakeClock();
 const manager=new TaskManager({},120,{clock});
 let called=false;
 const oldHandle=manager.once(()=>assert.fail('replaced callback must not run'),10,'shared');
 const newHandle=manager.once(()=>{called=true;},20,'shared');
 assert.equal(oldHandle.kill(),false);
 assert.ok(manager.plan.shared);
 await clock.advance(20);
 assert.equal(called,true);
 assert.equal(newHandle.kill(),false);
});

test('kill cancels the exact pending task',async()=>{
 const clock=new FakeClock();
 const manager=new TaskManager({},120,{clock});
 let called=false;
 const task=manager.once(()=>{called=true;},10);
 assert.equal(task.kill(),true);
 assert.equal(task.kill(),false);
 await clock.advance(20);
 assert.equal(called,false);
 assert.equal(manager.plan[task.name],undefined);
});

test('once removes itself before invoking callback so the callback can reuse its name',async()=>{
 const clock=new FakeClock();
 const manager=new TaskManager({},120,{clock});
 let secondCalled=false;
 manager.once(()=>{
  assert.equal(manager.plan.reusable,undefined);
  manager.once(()=>{secondCalled=true;},5,'reusable');
 },5,'reusable');
 await clock.advance(5);
 assert.ok(manager.plan.reusable);
 await clock.advance(5);
 assert.equal(secondCalled,true);
 assert.equal(manager.plan.reusable,undefined);
});

test('once validates callback, delay, and optional name',()=>{
 const manager=new TaskManager();
 assert.throws(()=>manager.once(null,10),/callback/);
 assert.throws(()=>manager.once(()=>{},0),/delay/);
 assert.throws(()=>manager.once(()=>{},NaN),/delay/);
 assert.throws(()=>manager.once(()=>{},10,''),/name/);
});

test('once cancellation handles preserve native timer unref support',()=>{
 const timers=new Map();
 let nextId=0;
 const clock={
  now:()=>0,
  setTimeout(callback,delay){const timer={id:++nextId,callback,delay,unrefCalled:false,unref(){this.unrefCalled=true;}};timers.set(timer.id,timer);return timer;},
  clearTimeout(timer){timers.delete(timer.id);}
 };
 const manager=new TaskManager({},120,{clock});
 const task=manager.once(()=>{},25);
 const timer=timers.get(1);
 assert.equal(task.unref(),true);
 assert.equal(timer.unrefCalled,true);
 assert.equal(task.kill(),true);
 assert.equal(task.unref(),false);
});
