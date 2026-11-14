// htdocs/engine/modules/effect/strategies/Character.js
import { resolveValue } from './Logic.js';
import { StatsHelpers } from './Stats.js';

const cloneValue = value => JSON.parse(JSON.stringify(value));
const isMoveEntry = value => !!(value && typeof value === 'object' && !Array.isArray(value) && typeof value.scene_id === 'string' && value.scene_id.length > 0);
const MOVE_TYPES = new Set(['random', 'list', 'list_reverse', 'list_loop_reverse', 'edge_bounce_first', 'edge_bounce_last', 'random_weight', 'random_count', 'follow_player', 'avoid_player']);

// Character movement effects operate on the character's movement configuration.
// Supported operations: set (move/moving/moveList), add/remove/replace (moveList).
const MovingLogic = {
    set: (char, eff) => {
        if (eff.property === 'move') {
            if (typeof eff.value !== 'string' || !MOVE_TYPES.has(eff.value)) return false;
            char.set ||= {};
            char.set.move = eff.value;
            return true;
        }
        if (eff.property === 'moving') {
            if (typeof eff.value !== 'boolean') return false;
            char.set ||= {};
            char.set.moving = eff.value;
            return true;
        }
        if (eff.property === 'moveList' && Array.isArray(eff.value) && eff.value.every(isMoveEntry)) {
            char.moveList = cloneValue(eff.value);
            char.place ||= { scene_id: null, currentIndex: 0 };
            char.place.currentIndex = 0;
            return true;
        }
        return false;
    },
    add: (char, eff) => {
        if (eff.property !== 'moveList' || !isMoveEntry(eff.value)) return false;
        char.moveList ||= [];
        char.moveList.push(cloneValue(eff.value));
        return true;
    },
    remove: (char, eff, indices) => {
        if (eff.property !== 'moveList' || !Array.isArray(char.moveList) || !indices.length) return false;
        const valid = [...new Set(indices)].filter(i => Number.isInteger(i) && i >= 0 && i < char.moveList.length).sort((a, b) => b - a);
        if (!valid.length) return false;
        const oldIndex = Number.isInteger(char.place?.currentIndex) ? char.place.currentIndex : 0;
        const removedBeforeCursor = valid.filter(i => i < oldIndex).length;
        valid.forEach(i => char.moveList.splice(i, 1));
        char.place ||= { scene_id: null, currentIndex: 0 };
        char.place.currentIndex = Math.max(0, Math.min(oldIndex - removedBeforeCursor, char.moveList.length - 1));
        return true;
    },
    replace: (char, eff, indices) => {
        if (eff.property !== 'moveList' || !Array.isArray(char.moveList) || indices.length !== 1 || !isMoveEntry(eff.value)) return false;
        const index = indices[0];
        if (!Number.isInteger(index) || index < 0 || index >= char.moveList.length) return false;
        char.moveList[index] = cloneValue(eff.value);
        return true;
    }
};

const StatsLogic = {
    swap: (engine, eff) => {
        const [idA, idB] = resolveCharacterPair(engine, eff);
        if (!idA || !idB) return;

        const charA = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: idA });
        const charB = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: idB });

        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';

        if (idA !== idB && charA && charB && charA.stats && charB.stats) {
            engine.api.engine.state.update('characters', characters => {
                const sourceStats = JSON.parse(JSON.stringify(characters[idA].stats));
                characters[idA].stats = JSON.parse(JSON.stringify(characters[idB].stats));
                characters[idB].stats = sourceStats;
                return characters;
            });
            if (idA === entryChar || idB === entryChar) engine.api.presentation.components.updatePlayerCard();
            engine.api.notifications.add("Hoán đổi", `Chỉ số giữa ${charA.set.name} và ${charB.set.name} đã thay đổi.`, "info", { source: 'scenario', category: 'scenario.character.stats_swap' });
        }
    },
    copy_to: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const [destId, srcId] = resolveCharacterPair(engine, eff, entryChar);
        if (!destId || !srcId) return;
        const statKey = eff.value;

        const destChar = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: destId });
        const srcChar = engine.api.engine.state.getRuntimeSnapshot('characters.[id]', { id: srcId });

        if (destId !== srcId && destChar && srcChar && srcChar.stats && Object.prototype.hasOwnProperty.call(srcChar.stats, statKey)) {
            engine.api.engine.state.update('characters.[id]', current => ({
                ...current,
                stats: { ...(current.stats || {}), [statKey]: JSON.parse(JSON.stringify(srcChar.stats[statKey])) }
            }), { id: destId });
            if (destId === entryChar) engine.api.presentation.components.updatePlayerCard();
        }
    },
    cut_to: (engine, eff) => {
        const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
        const [destId, srcId] = resolveCharacterPair(engine, eff, entryChar);
        if (!destId || !srcId) return;
        const statKey = eff.value;

        const destChar = engine.api.engine.state.getRuntime('characters.[id]', { id: destId });
        const srcChar = engine.api.engine.state.getRuntime('characters.[id]', { id: srcId });

        if (destId !== srcId && destChar && srcChar && srcChar.stats && Object.prototype.hasOwnProperty.call(srcChar.stats, statKey)) {
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

        if (char && char.stats && Object.prototype.hasOwnProperty.call(char.stats, statKey)) {
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
            const valRaw = String(resolveValue(eff.value, engine) ?? '');
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
            source: resolveValue(eff.source, engine),
            value: resolveValue(eff.value, engine)
        };
        StatsLogic[eff.exec]?.(engine, resolvedEff);
    },
    moving: (engine, eff) => {
        const rawTarget = resolveValue(eff.target, engine);
        const charId = engine.redirectTarget ? engine.redirectTarget(rawTarget) : rawTarget;
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        if (!char) return;

        const resolvedEff = {
            ...eff,
            target: charId,
            property: resolveValue(eff.property, engine),
            value: resolveValue(eff.value, engine)
        };
        const indices = Array.isArray(eff.index) ? eff.index : (Number.isInteger(eff.index) ? [eff.index] : []);
        const changed = MovingLogic[eff.exec]?.(char, resolvedEff, indices) === true;
        if (!changed) return;

        engine.api.engine.state.set('characters.[id]', char, { id: charId });
        engine.taskManager?.kill?.(`move_char_${charId}`);
        if (engine.validateMoveState(charId)) engine.scheduleCharacterMove(charId);
    }
};