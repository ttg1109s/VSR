import test from 'node:test';
import assert from 'node:assert/strict';
import { importModules } from './imports/index.js';

const modules = await importModules(['SceneSystem']);
const { SceneSystem } = modules.SceneSystem;

test('navigation coordinator serializes transition work', async () => {
    const scene = {
        runtime: {},
        _lifecycleGeneration: 1,
        endingState: null,
        withNavigationTransition: SceneSystem.withNavigationTransition
    };
    const order = [];
    const first = scene.withNavigationTransition(async () => {
        order.push('first:start');
        await new Promise(resolve => setTimeout(resolve, 10));
        order.push('first:end');
    });
    const second = scene.withNavigationTransition(async () => {
        order.push('second');
    });
    await Promise.all([first, second]);
    assert.deepEqual(order, ['first:start', 'first:end', 'second']);
});

test('post-transition activation schedules still and starts enter/timer hooks', () => {
    const order = [];
    const scene = {
        processRunnables(effects, context) { order.push(context.hook); return Promise.resolve(); },
        taskManager: {
            addNew(id) { order.push(id.startsWith('router_still_') ? 'still-task' : 'timer-task'); },
            operator() {}
        },
        updateTimerUI() { order.push('timer-ui'); },
        activeTimerTasks: [],
        api: { presentation: { scene: { hideTimer() {} } } },
        commitState() {},
        activateRouterPostTransition: SceneSystem.activateRouterPostTransition
    };
    scene.activateRouterPostTransition({
        state: { get: () => 's1', getRuntimeSnapshot: () => 'r1' },
        sId: 's1', routerId: 'r1',
        rd: { loop: { enter: ['enter'], still: ['still'] }, timer: { start: ['t_start'] } },
        rSet: { secondsStill: 5 },
        rConfigSet: { secondsStill: 5, timer: true, timerSeconds: 10 }
    });
    assert.deepEqual(order, ['enter', 'still-task', 't_start', 'timer-ui', 'timer-task', 'timer-task']);
});

test('navigation owner token is scoped to a transition and released afterwards', async () => {
    const scene = {
        runtime: {},
        _lifecycleGeneration: 4,
        endingState: null,
        withNavigationTransition: SceneSystem.withNavigationTransition,
        isNavigationOwner: SceneSystem.isNavigationOwner
    };
    let captured;
    const result = await scene.withNavigationTransition(async token => {
        captured = token;
        assert.equal(scene.isNavigationOwner(token), true);
        return token.id;
    });
    assert.equal(result, 1);
    assert.equal(scene.isNavigationOwner(captured), false);
    assert.equal(scene._navigationOwner, null);
});

test('navigation owner rejects token after runtime generation changes', async () => {
    const runtime = {};
    const scene = {
        runtime,
        _lifecycleGeneration: 7,
        endingState: null,
        withNavigationTransition: SceneSystem.withNavigationTransition,
        isNavigationOwner: SceneSystem.isNavigationOwner
    };
    let token;
    await scene.withNavigationTransition(async t => { token = t; });
    scene._navigationOwner = token;
    scene._lifecycleGeneration++;
    assert.equal(scene.isNavigationOwner(token), false);
});

test('navigation queue continues after a transition work failure', async () => {
    const scene = {
        runtime: {},
        _lifecycleGeneration: 2,
        endingState: null,
        withNavigationTransition: SceneSystem.withNavigationTransition
    };
    await assert.rejects(scene.withNavigationTransition(async () => {
        throw new Error('transition-failed');
    }), /transition-failed/);
    const next = await scene.withNavigationTransition(async () => 'recovered');
    assert.equal(next, 'recovered');
});


test('router task snapshot preserves timer remaining time, paused state, and timer UI state', () => {
    const snapshot = SceneSystem.snapshotRouterTasks.call({
        timerState: { active: true, sceneId: 's1', routerId: 'r1', paused: true, remainingMs: 4200 },
        taskManager: {
            plan: {
                router_still_s1_r1: { isPaused: false },
                timer_ui_s1_r1: { isPaused: true },
                timer_end_s1_r1: { isPaused: true }
            },
            running: { router_still_s1_r1: true, timer_ui_s1_r1: true, timer_end_s1_r1: true },
            getRemaining(id) { return ({ router_still_s1_r1: 8000, timer_ui_s1_r1: 1000, timer_end_s1_r1: 4200 })[id]; }
        }
    }, 's1', 'r1');
    assert.deepEqual(snapshot.remainingTimers, {
        router_still_s1_r1: 8000, timer_ui_s1_r1: 1000, timer_end_s1_r1: 4200
    });
    assert.deepEqual(snapshot.pausedTasks, ['timer_ui_s1_r1', 'timer_end_s1_r1']);
    assert.equal(snapshot.restoreStill, true);
    assert.equal(snapshot.timerState.paused, true);
    assert.equal(snapshot.timerState.remainingMs, 4200);
});

test('router task restore rehydrates only after rollback selects the original router', () => {
    let rehydrated;
    const state = {
        get(key) { return key === 'sceneId' ? 's1' : (key === 'scene.activeRouterId' ? 'r1' : undefined); },
        getRuntimeSnapshot(path, args) { return args.id === 's1' ? { activeRouterId: 'r1' } : null; }
    };
    const scene = {
        api: { engine: { state } },
        currentStillTask: 'stale',
        activeTimerTasks: ['stale-timer'],
        timerState: null,
        rehydrateRouterTasks(remaining, paused) { rehydrated = { remaining, paused }; },
        restoreRouterTasks: SceneSystem.restoreRouterTasks
    };
    scene.restoreRouterTasks({ remainingTimers: { timer_end_s1_r1: 3000 }, pausedTasks: ['timer_end_s1_r1'], restoreStill: true, timerState: { active: true, paused: true } }, 's1', 'r1');
    assert.deepEqual(rehydrated, { remaining: { timer_end_s1_r1: 3000 }, paused: ['timer_end_s1_r1'] });
    assert.equal(scene.currentStillTask, null);
    assert.deepEqual(scene.activeTimerTasks, []);
    assert.deepEqual(scene.timerState, { active: true, paused: true });
});


test('shouldSkipTransition skips only child-to-parent navigation', () => {
    const scene = {
        api: { engine: { state: { get: () => 'child' } } },
        getPath(id) {
            return id === 'child'
                ? [{ id: 'root' }, { id: 'parent' }, { id: 'child' }]
                : [{ id: 'root' }, { id: 'parent' }];
        },
        shouldSkipTransition: SceneSystem.shouldSkipTransition
    };
    assert.equal(scene.shouldSkipTransition('parent'), true);
    assert.equal(scene.shouldSkipTransition('root'), true);
});

test('shouldSkipTransition does not skip parent-to-child or unrelated navigation', () => {
    const scene = {
        api: { engine: { state: { get: () => 'parent' } } },
        getPath(id) {
            return id === 'parent'
                ? [{ id: 'root' }, { id: 'parent' }]
                : id === 'child'
                    ? [{ id: 'root' }, { id: 'parent' }, { id: 'child' }]
                    : [{ id: 'root' }, { id: 'other' }];
        },
        shouldSkipTransition: SceneSystem.shouldSkipTransition
    };
    assert.equal(scene.shouldSkipTransition('child'), false);
    assert.equal(scene.shouldSkipTransition('other'), false);
});

test('enterScene auto-skips only child-to-parent inside serialized navigation', async () => {
    const calls = [];
    const scene = {
        withNavigationTransition: work => Promise.resolve().then(() => work()),
        shouldSkipTransition: target => target === 'parent',
        _enterSceneCore(id, skip) { calls.push({ id, skip }); return { success: true }; },
        enterScene: SceneSystem.enterScene
    };
    await scene.enterScene('parent');
    await scene.enterScene('child');
    await scene.enterScene('other');
    await scene.enterScene('parent', true);
    assert.deepEqual(calls, [
        { id: 'parent', skip: true },
        { id: 'child', skip: false },
        { id: 'other', skip: false },
        { id: 'parent', skip: true }
    ]);
});
