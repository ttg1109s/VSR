import { importModules } from './imports/index.js';
const __testModules = await importModules(["ActionSystem"]);
const { ActionSystem } = __testModules.ActionSystem;

import test from 'node:test';
import assert from 'node:assert/strict';

test('permission-denied normal effects hold the global action processing lock', async () => {
  let nestedResult;
  let lockObservedInsideEffect = false;
  const commits = [];
  const engine = {
    ...ActionSystem,
    isActionProcessing: false,
    isTransitioning: false,
    pendingPasswordAction: null,
    src: {
      scenes: { scene: { routers: { router: { actions: ['action'] } } } },
      actions: {
        action: {
          set: { charAllow: ['npc'] },
          effect: { normal: [{ type: 'test' }] }
        }
      }
    },
    api: {
      engine: { state: {
        get(path, params) {
          if (path === 'sceneId') return 'scene';
          if (path === 'scene.activeRouterId') return 'router';
          if (path === 'entryCharacter') return 'player';
          return undefined;
        },
        getRuntimeSnapshot(path, params) {
          if (path === 'actions.[id]') return {};
          if (path === 'faker') return { active: false, mode: 'soul' };
          if (path === 'characters.[id]') return { set: { name: params?.id || 'Character' } };
          return undefined;
        }
      }},
      notifications: { add() {} },
      presentation: { effects: { shake() {} } }
    },
    getConfig(key) {
      if (key === 'fakerMode') return 'soul';
      if (key === 'allDescRead') return false;
      return undefined;
    },
    incrementActionCount() {},
    async processRunnables() {
      lockObservedInsideEffect = this.isActionProcessing === true;
      nestedResult = await this.handleAction('action', 'scene_router_action');
    },
    commitState(reason) { commits.push(reason); }
  };

  const result = await engine.handleAction('action', 'scene_router_action');
  assert.equal(result.reason, 'permission_denied');
  assert.equal(lockObservedInsideEffect, true);
  assert.equal(nestedResult.reason, 'busy');
  assert.equal(engine.isActionProcessing, false);
  assert.deepEqual(commits, ['action.changed']);
});
