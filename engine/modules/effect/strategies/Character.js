// htdocs/engine/modules/effect/strategies/Character.js
import { resolveValue } from './Logic.js';
import { StatsHelpers } from './Stats.js'; // [NEW]

const StatsLogic = {
    swap: (engine, eff) => {
        const parts = eff.target.split(':');
        if (parts.length < 2) return;

        const idA = engine.redirectTarget(parts[0]);
        const idB = engine.redirectTarget(parts[1]);

        const charA = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: idA });
        const charB = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: idB });

        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';

        if (charA && charB && charA.stats && charB.stats) {
            engine.api.engine.state.update('characters', characters => {
                const sourceStats = JSON.parse(JSON.stringify(characters[idA].stats));
                characters[idA].stats = JSON.parse(JSON.stringify(characters[idB].stats));
                characters[idB].stats = sourceStats;
                return characters;
            });
            if (idA === entryChar || idB === entryChar) engine.api.presentation.components.updatePlayerCard();
            engine.api.presentation.notification.add("Hoán đổi", `Chỉ số giữa ${charA.set.name} và ${charB.set.name} đã thay đổi.`, "info", { source: 'scenario', category: 'scenario.character.stats_swap' });
        }
    },
    copy_to: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const parts = eff.target.split(':');
        const destId = engine.redirectTarget(parts[0]);
        const srcId = parts[1] ? engine.redirectTarget(parts[1]) : entryChar;
        const statKey = eff.value;

        const destChar = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: destId });
        const srcChar = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: srcId });

        if (destChar && srcChar && srcChar.stats && srcChar.stats[statKey]) {
            engine.api.engine.state.update('characters.[id]', current => ({
                ...current,
                stats: { ...(current.stats || {}), [statKey]: JSON.parse(JSON.stringify(srcChar.stats[statKey])) }
            }), { id: destId });
            if (destId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },
    cut_to: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const parts = eff.target.split(':');
        const destId = engine.redirectTarget(parts[0]);
        const srcId = parts[1] ? engine.redirectTarget(parts[1]) : entryChar;
        const statKey = eff.value;

        const destChar = engine.api.engine.state.getRuntime('characters.[id]', { id: destId });
        const srcChar = engine.api.engine.state.getRuntime('characters.[id]', { id: srcId });

        if (destChar && srcChar && srcChar.stats && srcChar.stats[statKey]) {
            engine.api.engine.state.update('characters', characters => {
                characters[destId].stats ||= {};
                characters[destId].stats[statKey] = JSON.parse(JSON.stringify(characters[srcId].stats[statKey]));
                delete characters[srcId].stats[statKey];
                return characters;
            });
            if (destId === entryChar || srcId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },
    delete: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const targetId = engine.redirectTarget(eff.target);
        const statKey = eff.value;
        const char = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: targetId });

        if (char && char.stats && char.stats[statKey]) {
            engine.api.engine.state.update('characters.[id].stats', stats => {
                const next = { ...(stats || {}) };
                delete next[statKey];
                return next;
            }, { id: targetId });
            if (targetId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },
    add_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: charId });

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
                }, true, charId, engine);
                engine.api.engine.state.set('characters.[id]', char, { id: charId });
            } else {
                // Fallback if no colon, maybe just Key? But add_stats needs config.
                // Assuming defaults if just Key provided
                StatsHelpers.add_stats(char, {
                    property: valRaw,
                    value: "0:0:" + valRaw,
                    notify: true
                }, true, charId, engine);
                engine.api.engine.state.set('characters.[id]', char, { id: charId });
            }
        }
    },
    remove_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: charId });
        if (char) {
            StatsHelpers.remove_stats(char, { property: eff.value, notify: true }, true, charId, engine);
            engine.api.engine.state.set('characters.[id]', char, { id: charId });
        }
    }
};

export const CharacterStrategies = {
    edit_stats: (engine, eff) => {
        const charId = engine.redirectTarget(eff.target);
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        if (!char) return;

        if (!char.stats) char.stats = {};

        // Delegate to StatsHelpers.edit_value on a detached character snapshot.
        StatsHelpers.edit_value(char, eff, true, charId, engine);
        engine.api.engine.state.set('characters.[id]', char, { id: charId });
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
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        if (!char) return;

        const resolvedEff = {
            ...eff,
            target: charId, // Ensure resolved target is used
            property: resolveValue(eff.property, engine),
            value: resolveValue(eff.value, engine)
        };

        MovingLogic[eff.exec]?.(engine, char, resolvedEff, eff.index || []);
        engine.api.engine.state.set('characters.[id]', char, { id: charId });

        // Logic check VALIDATE MOVE STATE
        if (!engine.validateMoveState(charId)) {
            engine.taskManager.kill(`move_char_${charId}`);
            return;
        }

        if (char.set.moving && !engine.taskManager.plan[`move_char_${charId}`]) {
            engine.scheduleCharacterMove(charId);
        }
    }
};