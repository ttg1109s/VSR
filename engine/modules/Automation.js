import { resolveValue } from './effect/strategies/Logic.js';
import { API } from '../../api/index.js';

export const AutomationSystem = {
    runAutomation(autoId) {
        const state = this.state.automations[autoId];
        const template = this.src.templates.automation[autoId];
        if (!state || !template) return;

        // [FIXED] Use API to check 'active' via Schema (though write op needs direct access)
        if (state.active) return;

        state.active = true;
        state.countCurrent = 0;
        state.stepIndex = -1;

        if (state.moveDirection === 'last') {
            state.stepIndex = template.plan.length;
        } else {
            state.stepIndex = -1;
        }

        // [FIXED] Use API to get 'banClick'
        const isBanClick = API.engine.state.get('automation.banClick', { id: autoId });
        if (isBanClick) {
            API.render.navigation.setBlocking(true);
        }

        this.processAutomationStep(autoId);
    },

    stopAutomation(autoId) {
        const state = this.state.automations[autoId];
        if (!state) return;

        state.active = false;
        taskManager.kill(`auto_${autoId}`);

        // Check if ANY automation is blocking
        // [FIXED] Use API in loop if possible, but object iteration is faster here
        const anyBlocking = Object.values(this.state.automations).some(a => a.active && a.banClick);
        if (!anyBlocking) {
            API.render.navigation.setBlocking(false);
        }
    },

    async processAutomationStep(autoId) {
        const state = this.state.automations[autoId];
        const template = this.src.templates.automation[autoId];

        if (!state || !state.active) return;

        // [Config] stopEffectWhenChat
        if (this.getConfig && this.getConfig('stopEffectWhenChat') && this.chatState && this.chatState.active) {
            const taskId = `auto_${autoId}`;
            taskManager.kill(taskId);
            taskManager.addNew(taskId, {
                time: 1000,
                mode: 'timeout',
                count: 1,
                exe: () => {
                    this.processAutomationStep(autoId);
                }
            });
            taskManager.operator(taskId, 'enabled');
            return;
        }

        // [FIXED] Use API for countCurrent check
        const countCurrent = API.engine.state.get('automation.countCurrent', { id: autoId });
        const banClick = API.engine.state.get('automation.banClick', { id: autoId });
        const runInfinity = API.engine.state.get('automation.runInfinity', { id: autoId });
        const numberCycleAllow = API.engine.state.get('automation.numberCycleAllow', { id: autoId });

        if (runInfinity && banClick) {
            if (countCurrent > 5000) {
                console.warn(`SAFETY STOP: Automation '${autoId}' exceeded safety limit (5000) in blocking mode.`);
                this.stopAutomation(autoId);
                return;
            }
        }

        let nextIndex = -1;
        const planLen = template.plan.length;

        if (state.move === 'random') {
            nextIndex = Math.floor(Math.random() * planLen);
        } else {
            if (state.moveDirection === 'last') {
                nextIndex = state.stepIndex - 1;
            } else {
                nextIndex = state.stepIndex + 1;
            }
        }

        let isCycleComplete = false;
        if (state.moveDirection === 'last') {
            if (nextIndex < 0) isCycleComplete = true;
        } else {
            if (nextIndex >= planLen) isCycleComplete = true;
        }

        if (state.move !== 'random' && isCycleComplete) {
            state.countCurrent++;
            if (!runInfinity && state.countCurrent >= numberCycleAllow) {
                this.stopAutomation(autoId);
                return;
            }
            if (state.moveDirection === 'last') nextIndex = planLen - 1;
            else nextIndex = 0;
        }

        state.stepIndex = nextIndex;
        const step = template.plan[nextIndex];

        if (step && step.effect) {
            await this.processRunnables(step.effect, { automationId: autoId }, true);
        }

        if (!state.active) return;

        const minTime = this.getConfig ? this.getConfig('minAutomationNextStep') : 2;
        let rawSeconds = (step && step.seconds) ? resolveValue(step.seconds) : minTime;
        let configDelay = Number(rawSeconds);
        if (isNaN(configDelay)) configDelay = minTime;

        const finalSeconds = Math.max(minTime, configDelay);

        const taskId = `auto_${autoId}`;

        taskManager.addNew(taskId, {
            time: finalSeconds * 1000,
            mode: 'timeout',
            count: 1,
            exe: () => {
                this.processAutomationStep(autoId);
            }
        });
        taskManager.operator(taskId, 'enabled');
    }
};