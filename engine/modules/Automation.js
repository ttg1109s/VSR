import { resolveValue } from './effect/strategies/Logic.js';

export const AutomationSystem = {
    runAutomation(autoId) {
        const access = this.api.engine.state;
        const state = access.getRuntime('automations.[id]', { id: autoId });
        const template = access.getSource('templates.automation.[id]', { id: autoId });
        if (!state || !template || state.active) return;
        if (!Array.isArray(template.plan) || template.plan.length === 0) return;

        this.automationRunTokens ||= new Map();
        this.automationRunSequence = (this.automationRunSequence || 0) + 1;
        const runToken = this.automationRunSequence;
        this.automationRunTokens.set(autoId, runToken);
        this.automationRandomBags ||= new Map();
        this.automationRandomBags.delete(autoId);

        access.set('automation.active', true, { id: autoId });
        access.set('automation.countCurrent', 0, { id: autoId });
        access.set('automation.stepIndex', state.moveDirection === 'last' ? template.plan.length : -1, { id: autoId });
        access.set('automation.randomStepCount', 0, { id: autoId });

        if (access.get('automation.banClick', { id: autoId })) {
            this.setAutomationBlocking(autoId, true);
        }
        this.processAutomationStep(autoId, runToken).catch(error => {
            console.error(`Automation '${autoId}' stopped after an execution error:`, error);
            this.stopAutomation(autoId, runToken);
        });
    },

    isAutomationRunValid(autoId, runToken) {
        return runToken !== undefined &&
            this.automationRunTokens?.get(autoId) === runToken &&
            this.api.engine.state.get('automation.active', { id: autoId }) === true;
    },

    setAutomationBlocking(autoId, blocked) {
        this.automationBlockingOwners ||= new Set();
        if (blocked) this.automationBlockingOwners.add(autoId);
        else this.automationBlockingOwners.delete(autoId);
        this.api.presentation.navigation.setBlocking(this.automationBlockingOwners.size > 0);
    },

    stopAutomation(autoId, expectedRunToken = null) {
        const access = this.api.engine.state;
        if (!access.getRuntime('automations.[id]', { id: autoId })) return;
        const currentToken = this.automationRunTokens?.get(autoId);
        if (expectedRunToken !== null && currentToken !== expectedRunToken) return;

        // Invalidate first: already-running async callbacks cannot schedule a successor.
        this.automationRunTokens ||= new Map();
        this.automationRunTokens.delete(autoId);
        this.automationRandomBags?.delete(autoId);
        access.set('automation.active', false, { id: autoId });
        this.taskManager.kill(`auto_${autoId}`);
        this.setAutomationBlocking(autoId, false);
        this.commitState('automation.stopped');
    },

    async processAutomationStep(autoId, runToken) {
        const access = this.api.engine.state;
        const isRunValid = () => typeof this.isAutomationRunValid !== 'function' || this.isAutomationRunValid(autoId, runToken);
        if (!isRunValid()) return;
        const state = access.getRuntime('automations.[id]', { id: autoId });
        const template = access.getSource('templates.automation.[id]', { id: autoId });
        if (!state || !template) return;
        if (!Array.isArray(template.plan) || template.plan.length === 0) {
            this.stopAutomation(autoId, runToken);
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
                exe: () => this.processAutomationStep(autoId, runToken).catch(error => {
                    console.error(`Automation '${autoId}' stopped after an execution error:`, error);
                    this.stopAutomation(autoId, runToken);
                })
            });
            this.taskManager.operator(taskId, 'enabled');
            return;
        }

        const countCurrent = access.get('automation.countCurrent', { id: autoId });
        const banClick = access.get('automation.banClick', { id: autoId });
        const runInfinity = access.get('automation.runInfinity', { id: autoId });
        const cycleLimitRaw = access.get('automation.numberCycleAllow', { id: autoId });
        const numberCycleAllow = Number(cycleLimitRaw);
        if (!runInfinity && (!Number.isFinite(numberCycleAllow) || numberCycleAllow < 1)) {
            console.warn(`Automation '${autoId}' has an invalid cycle limit; stopping safely.`);
            this.stopAutomation(autoId, runToken);
            return;
        }

        if (runInfinity && banClick && countCurrent > 5000) {
            console.warn(`SAFETY STOP: Automation '${autoId}' exceeded safety limit (5000) in blocking mode.`);
            this.stopAutomation(autoId, runToken);
            return;
        }

        let nextIndex = -1;
        const planLen = template.plan.length;
        if (state.move === 'random') {
            let bag = this.automationRandomBags?.get(autoId);
            if (!Array.isArray(bag) || bag.length === 0) {
                bag = Array.from({ length: planLen }, (_, i) => i);
                for (let i = bag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bag[i], bag[j]] = [bag[j], bag[i]];
                }
                this.automationRandomBags ||= new Map();
                this.automationRandomBags.set(autoId, bag);
                const randomStepCount = Number(state.randomStepCount) || 0;
                if (randomStepCount >= planLen) {
                    const nextCount = countCurrent + 1;
                    access.set('automation.countCurrent', nextCount, { id: autoId });
                    access.set('automation.randomStepCount', 0, { id: autoId });
                    if (!runInfinity && nextCount >= numberCycleAllow) {
                        this.stopAutomation(autoId, runToken);
                        return;
                    }
                }
            }
            nextIndex = bag.pop();
        } else {
            nextIndex = state.moveDirection === 'last' ? state.stepIndex - 1 : state.stepIndex + 1;
            const isCycleComplete = state.moveDirection === 'last' ? nextIndex < 0 : nextIndex >= planLen;
            if (isCycleComplete) {
                const nextCount = countCurrent + 1;
                access.set('automation.countCurrent', nextCount, { id: autoId });
                if (!runInfinity && nextCount >= numberCycleAllow) {
                    this.stopAutomation(autoId, runToken);
                    return;
                }
                nextIndex = state.moveDirection === 'last' ? planLen - 1 : 0;
            }
        }

        if (!isRunValid()) return;
        access.set('automation.stepIndex', nextIndex, { id: autoId });
        const step = template.plan[nextIndex];
        if (step?.effect) {
            const effectResult = await this.processRunnables(step.effect, { automationId: autoId, automationRunToken: runToken }, true);
            if (effectResult?.error) throw effectResult.error;
        }
        // Revalidate after async effects: stop/restart must not let an old run advance.
        if (!isRunValid()) return;
        if (state.move === 'random') {
            access.set('automation.randomStepCount', (Number(access.get('automation.randomStepCount', { id: autoId })) || 0) + 1, { id: autoId });
        }

        const minTime = this.getConfig ? this.getConfig('minAutomationNextStep') : 2;
        const rawSeconds = step?.seconds !== undefined ? resolveValue(step.seconds, this) : minTime;
        const configDelay = Number(rawSeconds);
        const safeMinTime = Number.isFinite(Number(minTime)) && Number(minTime) >= 0 ? Number(minTime) : 2;
        const finalSeconds = Math.max(safeMinTime, Number.isFinite(configDelay) && configDelay >= 0 ? configDelay : safeMinTime);
        const taskId = `auto_${autoId}`;

        this.taskManager.kill(taskId);
        this.taskManager.addNew(taskId, {
            time: finalSeconds * 1000,
            mode: 'timeout',
            count: 1,
            exe: () => this.processAutomationStep(autoId, runToken).catch(error => {
                console.error(`Automation '${autoId}' stopped after an execution error:`, error);
                this.stopAutomation(autoId, runToken);
            })
        });
        this.taskManager.operator(taskId, 'enabled');
    }
};


const automationStateOf = engine => engine.api.engine.state;

export const AutomationPropertyHandlers = {
    state: (engine, target, val) => {
        const actions = { run: id => engine.runAutomation(id), stop: id => engine.stopAutomation(id) };
        if (actions[val]) actions[val](target);
    },
    __default__: (engine, target, val, prop) => {
        automationStateOf(engine).set('automations.[id].[property]', val, { id: target, property: prop });
    }
};
