import { resolveValue } from './effect/strategies/Logic.js';

export const AutomationSystem = {
    runAutomation(autoId) {
        const access = this.api.engine.state;
        const state = access.getRuntime('automations.[id]', { id: autoId });
        const template = access.getSource('templates.automation.[id]', { id: autoId });
        if (!state || !template || state.active) return;
        if (!Array.isArray(template.plan) || template.plan.length === 0) return;

        access.set('automation.active', true, { id: autoId });
        access.set('automation.countCurrent', 0, { id: autoId });
        access.set('automation.stepIndex', state.moveDirection === 'last' ? template.plan.length : -1, { id: autoId });
        access.set('automation.randomStepCount', 0, { id: autoId });

        if (access.get('automation.banClick', { id: autoId })) {
            this.api.presentation.navigation.setBlocking(true);
        }
        this.processAutomationStep(autoId);
    },

    stopAutomation(autoId) {
        const access = this.api.engine.state;
        if (!access.getRuntime('automations.[id]', { id: autoId })) return;

        access.set('automation.active', false, { id: autoId });
        this.commitState('automation.stopped');
        this.taskManager.kill(`auto_${autoId}`);

        const anyBlocking = Object.values(access.getRuntime('automations') || {})
            .some(item => item.active && item.banClick);
        if (!anyBlocking) this.api.presentation.navigation.setBlocking(false);
    },

    async processAutomationStep(autoId) {
        const access = this.api.engine.state;
        const state = access.getRuntime('automations.[id]', { id: autoId });
        const template = access.getSource('templates.automation.[id]', { id: autoId });
        if (!state || !state.active || !template) return;
        if (!Array.isArray(template.plan) || template.plan.length === 0) {
            this.stopAutomation(autoId);
            return;
        }

        const chatState = access.getSession('chatState');
        if (this.getConfig && this.getConfig('stopEffectWhenChat') && chatState?.active) {
            const taskId = `auto_${autoId}`;
            this.taskManager.kill(taskId);
            this.taskManager.addNew(taskId, {
                time: 1000,
                mode: 'timeout',
                count: 1,
                exe: () => this.processAutomationStep(autoId)
            });
            this.taskManager.operator(taskId, 'enabled');
            return;
        }

        const countCurrent = access.get('automation.countCurrent', { id: autoId });
        const banClick = access.get('automation.banClick', { id: autoId });
        const runInfinity = access.get('automation.runInfinity', { id: autoId });
        const numberCycleAllow = access.get('automation.numberCycleAllow', { id: autoId });

        if (runInfinity && banClick && countCurrent > 5000) {
            console.warn(`SAFETY STOP: Automation '${autoId}' exceeded safety limit (5000) in blocking mode.`);
            this.stopAutomation(autoId);
            return;
        }

        let nextIndex = -1;
        const planLen = template.plan.length;
        if (state.move === 'random' && (Number(state.randomStepCount) || 0) >= planLen) {
            const nextCount = countCurrent + 1;
            access.set('automation.countCurrent', nextCount, { id: autoId });
            access.set('automation.randomStepCount', 0, { id: autoId });
            if (!runInfinity && nextCount >= numberCycleAllow) {
                this.stopAutomation(autoId);
                return;
            }
        }
        if (state.move === 'random') {
            nextIndex = Math.floor(Math.random() * planLen);
        } else if (state.moveDirection === 'last') {
            nextIndex = state.stepIndex - 1;
        } else {
            nextIndex = state.stepIndex + 1;
        }

        let isCycleComplete = false;
        if (state.move !== 'random') {
            isCycleComplete = state.moveDirection === 'last' ? nextIndex < 0 : nextIndex >= planLen;
        }

        if (state.move !== 'random' && isCycleComplete) {
            const nextCount = countCurrent + 1;
            access.set('automation.countCurrent', nextCount, { id: autoId });
            if (!runInfinity && nextCount >= numberCycleAllow) {
                this.stopAutomation(autoId);
                return;
            }
            nextIndex = state.moveDirection === 'last' ? planLen - 1 : 0;
        }

        access.set('automation.stepIndex', nextIndex, { id: autoId });
        const step = template.plan[nextIndex];
        if (step?.effect) await this.processRunnables(step.effect, { automationId: autoId }, true);
        if (!access.get('automation.active', { id: autoId })) return;
        if (state.move === 'random') {
            access.set('automation.randomStepCount', (Number(state.randomStepCount) || 0) + 1, { id: autoId });
        }

        const minTime = this.getConfig ? this.getConfig('minAutomationNextStep') : 2;
        const rawSeconds = step?.seconds ? resolveValue(step.seconds) : minTime;
        const configDelay = Number(rawSeconds);
        const finalSeconds = Math.max(minTime, Number.isFinite(configDelay) ? configDelay : minTime);
        const taskId = `auto_${autoId}`;

        this.taskManager.addNew(taskId, {
            time: finalSeconds * 1000,
            mode: 'timeout',
            count: 1,
            exe: () => this.processAutomationStep(autoId)
        });
        this.taskManager.operator(taskId, 'enabled');
    }
};
