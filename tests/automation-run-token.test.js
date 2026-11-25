import { importModules } from './imports/index.js';
const __testModules = await importModules(["AutomationSystem"]);
const { AutomationSystem } = __testModules.AutomationSystem;

import test from 'node:test';
import assert from 'node:assert/strict';

test('stale automation execution cannot schedule after Stop/Start replaces its run token', async () => {
    let releaseEffect;
    const effectPromise = new Promise(resolve => { releaseEffect = resolve; });
    const runtime = {
        active: true,
        move: 'forward',
        moveDirection: 'first',
        stepIndex: -1,
        countCurrent: 0,
        randomStepCount: 0,
        banClick: false,
        runInfinity: true,
        numberCycleAllow: 1
    };
    const template = { plan: [{ effect: [{ type: 'wait' }], seconds: 1 }] };
    const scheduled = [];
    const access = {
        getRuntime: () => runtime,
        getSource: () => template,
        get: (path) => path === 'automation.countCurrent' ? runtime.countCurrent :
            path === 'automation.banClick' ? runtime.banClick :
            path === 'automation.runInfinity' ? runtime.runInfinity :
            path === 'automation.numberCycleAllow' ? runtime.numberCycleAllow :
            path === 'automation.active' ? runtime.active : undefined,
        set(path, value) {
            if (path === 'automation.active') runtime.active = value;
            if (path === 'automation.countCurrent') runtime.countCurrent = value;
            if (path === 'automation.stepIndex') runtime.stepIndex = value;
            if (path === 'automation.randomStepCount') runtime.randomStepCount = value;
        },
        getSession: () => null
    };
    const context = Object.assign({}, AutomationSystem, {
        api: { engine: { state: access }, presentation: { navigation: { setBlocking() {} } } },
        automationRunTokens: new Map([['a', 1]]),
        taskManager: {
            kill() {},
            addNew(id, task) { scheduled.push({ id, task }); },
            operator() {}
        },
        processRunnables: () => effectPromise,
        getConfig: () => 0,
        commitState() {}
    });

    const oldRun = context.processAutomationStep('a', 1);
    // Stop and restart while the old run's effect is awaiting.
    context.automationRunTokens.set('a', 2);
    runtime.active = true;
    releaseEffect();
    await oldRun;
    assert.equal(scheduled.length, 0);
});
