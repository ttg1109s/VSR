export const TaskScheduling = {
 scheduleDelay(ms,callback,taskId=null){
   const id=taskId||`engine_delay_${++this.taskSequence}`;
   this.taskManager.kill(id);
   this.taskManager.addNew(id,{time:Math.max(1,Number(ms)||1),mode:'timeout',count:1,exe:callback});
   this.taskManager.operator(id,'enabled');return id;
  }
 
 schedulePasswordExpiry(challenge, action) {
   if (!challenge || challenge.deadlineAt === null || challenge.deadlineAt === undefined) return null;
   const taskId = `password_${challenge.challengeId}`;
   const remaining = challenge.deadlineAt - this.passwordSystem.clock();
   return this.scheduleDelay(Math.max(1, remaining), async () => {
    if (this.pendingPasswordAction?.challengeId !== challenge.challengeId) return;
    const inspected = this.passwordSystem.inspect(challenge);
    if (inspected.accepted) {
     // Timers can fire early under clock adjustments or scheduler jitter.
     // Re-arm against the absolute deadline instead of losing the expiry.
     this.schedulePasswordExpiry(challenge, action);
     return;
    }
    if (inspected.reason === 'expired') {
     const attempt=this.passwordSystem.recordFailure(challenge,{allowExpired:true});
     if (!attempt.accepted) return;
     if (!attempt.exhausted) this.passwordSystem.finish(challenge, 'expired');
     this.pendingPasswordAction = null;
     this.api.engine.state.set('session.passwordChallenge', null);
     this.notifications.add('Challenge expired','The password challenge has expired.','warning',{
      source:'engine',
      category:'action.password_expired',
      dedupeKey:`action.password_expired:${challenge.challengeId}`
     });
     await this.finishPasswordAction(action, challenge.actionId, challenge.uniqueId, 'expired', {
      sceneId: challenge.sceneId, routerId: challenge.routerId
     });
     return;
    }
    this.commitState('password.challenge.inactive');
   }, taskId);
  }
 
 clearPasswordExpiry(challenge) {
   if (challenge?.challengeId) this.taskManager?.kill?.(`password_${challenge.challengeId}`);
  }
 
 delay(ms){return new Promise(resolve=>this.scheduleDelay(ms,resolve));}
 
 rehydrateBackgroundTasks(){
   const timers=this.restoredTaskTimers||{};
   for(const charId of Object.keys(this.api.engine.state.getRuntimeSnapshot('characters') || {})) {
    const remaining=timers[`move_char_${charId}`];
    const taskId=`move_char_${charId}`;
    this.scheduleCharacterMove(charId,Number.isFinite(remaining)?remaining:null);
    if(this.restoredPausedTasks.includes(taskId))this.taskManager.pause(taskId);
    const stillRemaining=Object.entries(timers).find(([name])=>name.startsWith(`move_still_${charId}_`));
    if(stillRemaining) {
     const visitToken=this.getCharacterVisitToken(charId);
     this.scheduleCharacterStill(charId,visitToken,stillRemaining[1]);
     const restoredStillTaskId=this.characterStillTaskIds?.get(charId);
     if(restoredStillTaskId&&this.restoredPausedTasks.includes(stillRemaining[0]))this.taskManager.pause(restoredStillTaskId);
    }
   }
   for(const[id,state]of Object.entries(this.api.engine.state.getRuntimeSnapshot('automations') || {})) {
    if(!state?.active)continue;
    const taskId=`auto_${id}`;
    const remaining=timers[taskId];
    this.automationRunTokens ||= new Map();this.automationRunSequence=(this.automationRunSequence||0)+1;const runToken=this.automationRunSequence;this.automationRunTokens.set(id,runToken);
    this.automationRandomBags ||= new Map();
    const savedBag=this.restoredAutomationRandomBags?.[id];if(Array.isArray(savedBag))this.automationRandomBags.set(id,[...savedBag]);
    if(state.banClick)this.setAutomationBlocking(id,true);
    if(Number.isFinite(remaining))this.scheduleDelay(remaining,()=>this.processAutomationStep(id,runToken),taskId);
    else this.processAutomationStep(id,runToken).catch(error=>{console.error(`Restored automation '${id}' failed:`,error);this.stopAutomation(id,runToken);});
    if(this.restoredPausedTasks.includes(taskId))this.taskManager.pause(taskId);
   }
   this.rehydrateRouterTasks?.(timers, this.restoredPausedTasks);
   this.restoredTaskTimers={};
   this.restoredPausedTasks=[];
   this.restoredAutomationRandomBags={};
  }
 
 pauseBackgroundTasks(){
   for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('automations') || {}))if(this.api.engine.state.get('automation.active', { id }))this.taskManager.pause(`auto_${id}`);
   for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('characters') || {}))this.taskManager.pause(`move_char_${id}`);
   for(const id of Object.keys(this.taskManager.plan || {}))if(['move_still_','router_still_','timer_ui_','timer_end_'].some(prefix=>id.startsWith(prefix)))this.taskManager.pause(id);
  }
 
 resumeBackgroundTasks(){
   for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('automations') || {}))if(this.api.engine.state.get('automation.active', { id }))this.taskManager.resume(`auto_${id}`);
   for(const id of Object.keys(this.api.engine.state.getRuntimeSnapshot('characters') || {}))this.taskManager.resume(`move_char_${id}`);
   for(const id of Object.keys(this.taskManager.plan || {}))if(['move_still_','router_still_','timer_ui_','timer_end_'].some(prefix=>id.startsWith(prefix)))this.taskManager.resume(id);
  }
};
