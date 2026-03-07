// htdocs/engine/modules/effect/strategies/Character.js
import { resolveValue } from './Logic.js';
import { API } from '../../../../api/index.js';
import { StatsHelpers } from './Stats.js'; // [NEW]

const StatsLogic = {
    swap: (engine, eff) => {
        const parts = eff.target.split(':');
        if (parts.length < 2) return;

        const idA = engine.redirectTarget(parts[0]);
        const idB = engine.redirectTarget(parts[1]);

        const charA = engine.state.characters[idA];
        const charB = engine.state.characters[idB];

        const entryChar = engine.state.meta?.entryCharacter || 'player';

        if (charA && charB && charA.stats && charB.stats) {
            const tempStats = JSON.parse(JSON.stringify(charA.stats));
            charA.stats = JSON.parse(JSON.stringify(charB.stats));
            charB.stats = tempStats;

            if (idA === entryChar || idB === entryChar) API.render.components.updatePlayerCard();
            API.render.notification.add("Hoán đổi", `Chỉ số giữa ${charA.set.name} và ${charB.set.name} đã thay đổi.`, "info");
        }
    },
    copy_to: (engine, eff) => {
        const entryChar = engine.state.meta?.entryCharacter || 'player';
        const parts = eff.target.split(':');
        const destId = engine.redirectTarget(parts[0]);
        const srcId = parts[1] ? engine.redirectTarget(parts[1]) : entryChar;
        const statKey = eff.value;

        const destChar = engine.state.characters[destId];
        const srcChar = engine.state.characters[srcId];

        if (destChar && srcChar && srcChar.stats && srcChar.stats[statKey]) {
            if (!destChar.stats) destChar.stats = {};
            destChar.stats[statKey] = JSON.parse(JSON.stringify(srcChar.stats[statKey]));
            if (destId === entryChar) API.render.components.updatePlayerCard();
        }
    },
    cut_to: (engine, eff) => {
        const entryChar = engine.state.meta?.entryCharacter || 'player';
        const parts = eff.target.split(':');
        const destId = engine.redirectTarget(parts[0]);
        const srcId = parts[1] ? engine.redirectTarget(parts[1]) : entryChar;
        const statKey = eff.value;

        const destChar = engine.state.characters[destId];
        const srcChar = engine.state.characters[srcId];

        if (destChar && srcChar && srcChar.stats && srcChar.stats[statKey]) {
            if (!destChar.stats) destChar.stats = {};
            destChar.stats[statKey] = JSON.parse(JSON.stringify(srcChar.stats[statKey]));
            delete srcChar.stats[statKey];
            if (destId === entryChar || srcId === entryChar) API.render.components.updatePlayerCard();
        }
    },
    delete: (engine, eff) => {
        const entryChar = engine.state.meta?.entryCharacter || 'player';
        const targetId = engine.redirectTarget(eff.target);
        const statKey = eff.value;
        const char = engine.state.characters[targetId];

        if (char && char.stats && char.stats[statKey]) {
            delete char.stats[statKey];
            if (targetId === entryChar) API.render.components.updatePlayerCard();
        }
    },
    add_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.state.characters[charId];

        if (char) {
            const valRaw = resolveValue(eff.value, engine);
            // Format expectation: "Key:Current:Max:Label:Color"
            // We need to separate Key from the rest to map to StatsHelpers (property=Key, value=Rest)
            const firstColon = valRaw.indexOf(':');

            if (firstColon > -1) {
                const prop = valRaw.substring(0, firstColon);
                const config = valRaw.substring(firstColon + 1);

                StatsHelpers.add_stats(char, {
                    property: prop,
                    value: config,
                    notify: true
                }, true, charId);
            } else {
                // Fallback if no colon, maybe just Key? But add_stats needs config.
                // Assuming defaults if just Key provided
                StatsHelpers.add_stats(char, {
                    property: valRaw,
                    value: "0:0:" + valRaw,
                    notify: true
                }, true, charId);
            }
        }
    },
    remove_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.state.characters[charId];
        if (char) {
            StatsHelpers.remove_stats(char, { property: eff.value, notify: true }, true, charId);
        }
    }
};

export const CharacterStrategies = {
    edit_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.state.characters[charId];
        if (!char) return;

        if (!char.stats) char.stats = {};

        // Delegate to StatsHelpers.edit_value
        StatsHelpers.edit_value(char, eff, true, charId);
    },
    mng_stats: (engine, eff) => {
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, engine),
            value: resolveValue(eff.value, engine)
        };
        StatsLogic[eff.exec]?.(engine, resolvedEff);
    },
    moving: (engine, eff) => {
        const charId = resolveValue(eff.target, engine);
        const char = engine.state.characters[charId];
        if (!char) return;

        const resolvedEff = {
            ...eff,
            target: charId, // Ensure resolved target is used
            property: resolveValue(eff.property, engine),
            value: resolveValue(eff.value, engine)
        };

        MovingLogic[eff.exec]?.(engine, char, resolvedEff, eff.index || []);

        // Logic check VALIDATE MOVE STATE
        if (!engine.validateMoveState(charId)) {
            taskManager.kill(`move_char_${charId}`);
            return;
        }

        if (char.set.moving && !taskManager.plan[`move_char_${charId}`]) {
            engine.scheduleCharacterMove(charId);
        }
    }
};