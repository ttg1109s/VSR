// htdocs/engine/modules/effect/strategies/Handlers.js

export const AutomationPropertyHandlers = {
    state: (engine, target, val) => {
        const actions = { run: (id) => engine.runAutomation(id), stop: (id) => engine.stopAutomation(id) };
        if (actions[val]) actions[val](target);
    },
    __default__: (engine, target, val, prop) => { engine.state.automations[target][prop] = val; }
};

export const ScenePropertyHandlers = {
    blocked: (engine, scene, val) => {
        scene.blocked = val;
        if (val === false) engine.resumeNPCMovement();
        engine.render();
    },
    activeRouterId: (engine, scene, val, sId) => {
        scene.activeRouterId = val;
        if (sId === engine.state.sceneId) engine.enterRouter(val);
        else engine.render();
    },
    __default__: (engine, scene, val, sId, prop) => { scene[prop] = val; engine.render(); }
};

export const RouterPropertyHandlers = {
    blocked: (engine, router, val) => {
        router.blocked = val;
        if (val === false) engine.resumeNPCMovement();
        engine.render();
    },
    __default__: (engine, router, val, rId, prop) => { router[prop] = val; engine.render(); }
};

export const ActionPropertyHandlers = {
    __default__: (engine, action, val, actKey, prop) => {
        action[prop] = val;
        if (engine.chatState.active && engine.chatState.triggerActionId === actKey) {
            engine.chatState.actionModified = true;
        }
        engine.render();
    }
};

export const CharacterPropertyHandlers = {
    meeting: () => { },
    moveList: (engine, char, val) => {
        // [REFACTOR] Use 'char.place.currentIndex'
        char.place.currentIndex = 0;
        char.moveList = val;
    },
    moving: (engine, char, val, charId) => {
        char.set.moving = val;
        if (val === true) {
            engine.scheduleCharacterMove(charId);
        } else {
            taskManager.kill(`move_char_${charId}`);
            if (engine.checkQueueAndResume) {
                engine.checkQueueAndResume();
            }
        }
    },
    met: (engine, char, val) => { char.set.met = val; ui.renderCharScreen(); },

    __default__: (engine, char, val, charId, prop) => { char.set[prop] = val; }
};