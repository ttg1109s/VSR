export class Loop {
 constructor(time=0,callback=()=>{},mode='interval',count=0,clock=globalThis){
  Object.assign(this,{time,callback,mode,count,clock});this.currentCount=0;this.timerId=null;this.isRunning=false;this.isBusy=false;this.expected=0;this.lastTick=0;this.isPaused=false;this.remainingTime=0;this.dueAt=0;
 }
 #now(){return typeof this.clock.now==='function'?this.clock.now():Date.now();}
 #schedule(ms){if(!this.isRunning||this.isPaused)return;this.dueAt=this.#now()+Math.max(0,ms);this.timerId=this.clock.setTimeout(()=>this.#tick(),Math.max(0,ms));}
 async #tick(){
  if(!this.isRunning||this.isPaused||this.isBusy)return;this.timerId=null;this.isBusy=true;this.lastTick=this.#now();
  try{await this.callback();}catch(error){console.error('TaskManager Callback Error:',error);}
  finally{this.isBusy=false;if(!this.isRunning||this.isPaused)return;this.currentCount++;if(this.count>0&&this.currentCount>=this.count){this.disabled();return;}
   if(this.mode==='interval')this.#schedule(this.time);else{this.expected+=this.time;this.#schedule(Math.max(10,this.expected-this.#now()));}
  }
 }
 enabled(){if(typeof this.callback!=='function')throw new TypeError('TaskManager callback must be a function.');if(!Number.isFinite(this.time)||this.time<=0)throw new TypeError('TaskManager time must be greater than zero.');if(this.isRunning)return;this.isRunning=true;this.isPaused=false;this.currentCount=0;this.isBusy=false;this.lastTick=this.#now();this.expected=this.lastTick+this.time;this.#schedule(this.time);}
 disabled(){this.isRunning=false;this.isPaused=false;if(this.timerId!==null)this.clock.clearTimeout(this.timerId);this.timerId=null;}
 remaining(){if(!this.isRunning)return null;return this.isPaused?this.remainingTime:Math.max(0,this.dueAt-this.#now());}
 pause(){if(!this.isRunning||this.isPaused)return;this.remainingTime=Math.max(0,this.dueAt-this.#now());this.isPaused=true;if(this.timerId!==null)this.clock.clearTimeout(this.timerId);this.timerId=null;}
 resume(){if(!this.isRunning||!this.isPaused)return;this.isPaused=false;if(this.mode==='timeout')this.expected=this.#now()+this.remainingTime;this.#schedule(this.remainingTime);}
}
export class TaskManager {
 constructor(plan={},delayEnd=120,{clock=globalThis}={}){this.plan=plan;this.running={};this.delayEnd=delayEnd;this.clock=clock;}
 #validate(name,config){if(typeof name!=='string'||!name.trim())throw new TypeError('Task name is required.');if(!config||typeof config!=='object')throw new TypeError('Task configuration is required.');if(this.plan[name])this.kill(name);if(typeof config.time!=='number'||!Number.isFinite(config.time)||config.time<=0)throw new TypeError(`Invalid time for task ${name}`);if(typeof config.exe!=='function')throw new TypeError('Task executor must be a function.');}
 operator(name,mode){const loop=this.plan[name];if(!loop)return;if(mode==='enabled'&&!this.running[name]){this.running[name]=true;loop.enabled();}else if(mode==='disabled'&&this.running[name]){this.running[name]=false;loop.disabled();}}
 addNew(name,config){this.#validate(name,config);this.plan[name]=new Loop(config.time,config.exe,config.mode||'interval',config.count??0,this.clock);this.running[name]=false;}
 kill(name){if(!this.plan[name])return;this.plan[name].disabled();delete this.plan[name];delete this.running[name];}
 killAll(){for(const name of Object.keys(this.plan))this.kill(name);}
 getRemaining(name){return this.plan[name]&&this.running[name]?this.plan[name].remaining():null;}
 hasBusyTasks(prefixes=['auto_','move_char_']){return Object.keys(this.plan).some(name=>prefixes.some(prefix=>name.startsWith(prefix))&&this.plan[name]?.isBusy);}
 snapshotRemaining(prefixes=['auto_','move_char_']){const result={};for(const name of Object.keys(this.plan)){if(prefixes.some(prefix=>name.startsWith(prefix))){const remaining=this.getRemaining(name);if(remaining!==null)result[name]=remaining;}}return result;}
 pause(name){if(this.plan[name]&&this.running[name])this.plan[name].pause();}
 resume(name){if(this.plan[name]&&this.running[name])this.plan[name].resume();}
}
