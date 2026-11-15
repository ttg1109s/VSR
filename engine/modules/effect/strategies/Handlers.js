// Centralized mutation handlers for effect-driven state changes.

const stateOf = engine => engine.api.engine.state;

export const AutomationPropertyHandlers = {
    state: (engine, target, val) => {
        const actions = { run: id => engine.runAutomation(id), stop: id => engine.stopAutomation(id) };
        if (actions[val]) actions[val](target);
    },
    __default__: (engine, target, val, prop) => {
        stateOf(engine).set('automations.[id].[property]', val, { id: target, property: prop });
    }
};

export const ScenePropertyHandlers = {
    blocked: (engine, scene, val, sceneId) => {
        stateOf(engine).set('scenes.[id].blocked', val, { id: sceneId });
        if (val === false) engine.resumeNPCMovement();
    },
    activeRouterId: (engine, scene, val, sceneId) => {
        stateOf(engine).set('scenes.[id].activeRouterId', val, { id: sceneId });
        if (sceneId === stateOf(engine).sceneId) engine.enterRouter(val);
        // StateAccess.set publishes the committed snapshot; no imperative render API is required.
    },
    __default__: (engine, scene, val, sceneId, prop) => {
        stateOf(engine).set('scenes.[id].[property]', val, { id: sceneId, property: prop });
    }
};

export const RouterPropertyHandlers = {
    blocked: (engine, router, val, routerId) => {
        const sceneId = stateOf(engine).sceneId;
        stateOf(engine).set('routers.[routerKey].blocked', val, { routerKey: `${sceneId}_${routerId}` });
        if (val === false) engine.resumeNPCMovement();
    },
    __default__: (engine, router, val, routerId, prop) => {
        const sceneId = stateOf(engine).sceneId;
        stateOf(engine).set('routers.[routerKey].[property]', val, {
            routerKey: `${sceneId}_${routerId}`,
            property: prop
        });
    }
};

export const ActionPropertyHandlers = {
    __default__: (engine, action, val, actKey, prop) => {
        stateOf(engine).set('actions.[actionKey].[property]', val, { actionKey: actKey, property: prop });
        const state = stateOf(engine);
        const chatState = state.getSession('chatState');
        if (chatState?.active && chatState.triggerActionId === actKey) {
            state.set('chatState.actionModified', true, {}, { namespace: 'session' });
        }
    }
};

export const CharacterPropertyHandlers = {
    meeting: () => { },
    moveList: (engine, char, val, charId) => {
        stateOf(engine).set('characters.[id].place.currentIndex', 0, { id: charId });
        stateOf(engine).set('characters.[id].moveList', val, { id: charId });
    },
    moving: (engine, char, val, charId) => {
        stateOf(engine).set('characters.[id].set.moving', val, { id: charId });
        if (val === true) {
            engine.scheduleCharacterMove(charId);
        } else {
            engine.taskManager.kill(`move_char_${charId}`);
            if (engine.checkQueueAndResume) engine.checkQueueAndResume();
        }
    },
    met: (engine, char, val, charId) => {
        stateOf(engine).set('characters.[id].set.met', val, { id: charId });
        engine.api.presentation.components.renderCharacterScreen();
    },
    __default__: (engine, char, val, charId, prop) => {
        stateOf(engine).set('characters.[id].set.[property]', val, { id: charId, property: prop });
    }
};
