// htdocs/engine/modules/effect/strategies/Character.js
import { resolveValue } from './Logic.js';
import { StatsHelpers } from './Stats.js';

const cloneValue = value => JSON.parse(JSON.stringify(value));
const isMoveEntry = value => !!(value && typeof value === 'object' && !Array.isArray(value) && typeof value.scene_id === 'string' && value.scene_id.length > 0 && typeof value.entryId === 'string' && /^[A-Za-z0-9.-]+$/.test(value.entryId) && Number.isSafeInteger(value.countVisited ?? 0) && (value.countVisited ?? 0) >= 0);
const isUniqueMoveList = list => Array.isArray(list) && list.every(isMoveEntry) && new Set(list.map(entry => entry.entryId)).size === list.length;
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
        if (eff.property === 'moveList' && isUniqueMoveList(eff.value)) {
            char.moveList = eff.value.map(entry => ({ countVisited: 0, ...cloneValue(entry) }));
            char.place ||= { scene_id: null, currentIndex: 0 };
            char.place.currentIndex = 0;
            return true;
        }
        return false;
    },
    add: (char, eff) => {
        if (eff.property !== 'moveList' || !isMoveEntry(eff.value)) return false;
        char.moveList ||= [];
        if (char.moveList.some(entry => entry?.entryId === eff.value.entryId)) return false;
        char.moveList.push({ countVisited: 0, ...cloneValue(eff.value) });
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
        if (eff.property !== 'moveList' || !Array.isArray(char.moveList) || !indices.length ||
            !eff.value || typeof eff.value !== 'object' || Array.isArray(eff.value) ||
            typeof eff.value.scene_id !== 'string' || !eff.value.scene_id) return false;
        const valid = [...new Set(indices)];
        if (valid.some(index => !Number.isInteger(index) || index < 0 || index >= char.moveList.length)) return false;
        const next = cloneValue(char.moveList);
        valid.forEach(index => {
            const original = next[index];
            // Replacement changes route configuration, but stable identity and
            // visit counters belong to the entry slot and must survive.
            next[index] = { ...cloneValue(eff.value), entryId: original.entryId, countVisited: original.countVisited ?? 0 };
        });
        if (!isUniqueMoveList(next)) return false;
        char.moveList = next;
        return true;
    }
};

const resolveCharacterPair = (engine, eff, defaultSource = null) => {
    const target = String(eff.target ?? '');
    const source = eff.source === undefined || eff.source === null || eff.source === ''
        ? defaultSource
        : String(eff.source);
    return [
        engine.redirectTarget(target),
        source ? engine.redirectTarget(source) : null
    ];
};

// Transfer a single item ID between two characters without cloning itemInfo state.
const ItemTransferLogic = {
    transfer: async (engine, eff) => {
        const [targetId, sourceId] = resolveCharacterPair(engine, eff);
        const itemId = typeof eff.value === 'string' ? eff.value : '';
        if (!targetId || !sourceId || !itemId || targetId === sourceId) return;

        const state = engine.api.engine.state;
        const itemInfo = state.getRuntimeSnapshot('itemInfo.[id]', { id: itemId });
        if (!itemInfo) return;

        const maxInventory = (engine.getConfig ? engine.getConfig('maxInventory') : null)
            || state.getRuntimeSnapshot('config.maxInventory')
            || [];
        const targetLimitPair = Array.isArray(maxInventory)
            ? maxInventory.find(pair => Array.isArray(pair) && pair[1] === targetId)
            : null;
        const targetLimit = targetLimitPair ? Number(targetLimitPair[0]) : 0;
        const configuredMaxHand = engine.getConfig ? engine.getConfig('maxHandOn') : undefined;
        const maxHand = configuredMaxHand === undefined || configuredMaxHand === null
            ? 10
            : Number(configuredMaxHand);

        const result = await state.transaction(tx => {
            const source = tx.get('characters.[id]', { id: sourceId });
            const target = tx.get('characters.[id]', { id: targetId });
            if (!source || !target) return 'missing_character';

            const sourceInventory = Array.isArray(source.inventory) ? [...source.inventory] : [];
            const targetInventory = Array.isArray(target.inventory) ? [...target.inventory] : [];
            if (!sourceInventory.includes(itemId)) return 'not_owned';
            if (targetInventory.includes(itemId)) return 'duplicate';
            if (targetLimit > 0 && targetInventory.length >= targetLimit) return 'inventory_full';

            const sourceHand = Array.isArray(source.hand) ? [...source.hand] : [];
            const targetHand = Array.isArray(target.hand) ? [...target.hand] : [];
            const wasInHand = sourceHand.includes(itemId);

            source.inventory = sourceInventory.filter(id => id !== itemId);
            source.hand = sourceHand.filter(id => id !== itemId);
            target.inventory = [...targetInventory, itemId];

            // A zero/non-positive hand limit means unlimited, matching the schema contract.
            if (wasInHand && (!(maxHand > 0) || targetHand.length < maxHand)) {
                target.hand = targetHand.includes(itemId) ? targetHand : [...targetHand, itemId];
            }

            tx.set('characters.[id]', source, { id: sourceId });
            tx.set('characters.[id]', target, { id: targetId });
            return wasInHand && !target.hand?.includes(itemId) ? 'transferred_unequipped' : 'transferred';
        });

        if (result !== 'transferred' && result !== 'transferred_unequipped') return;

        const entryChar = state.getRuntime('meta.entryCharacter') || 'player';
        if (sourceId === entryChar || targetId === entryChar) {
            engine.api.presentation.components?.updateItemModal?.(itemId);
            engine.api.presentation.components?.explorer?.();
            engine.api.presentation.components?.updatePlayerCard?.();
        }
        engine.commitState?.('inventory.changed');
        engine.api.notifications?.add?.(
            'Item transferred',
            `Transferred ${itemInfo.name || itemId} from ${sourceId} to ${targetId}.`,
            'info',
            { source: 'engine', category: 'character.item_transfer' }
        );
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
            engine.api.notifications.notify({ title: "Stats swapped", message: `Stats between ${charA.set?.name || idA} and ${charB.set?.name || idB} have changed.`, level: "info", source: "engine", category: "character.stats_swap", metadata: { operation: "swap", targetIds: [idA, idB] } });
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
            engine.api.notifications.notify({ title: "Stat copied", message: `Copied ${statKey} from ${srcChar.set?.name || srcId} to ${destChar.set?.name || destId}.`, level: "info", source: "engine", category: "character.stats_copy", metadata: { operation: "copy", statId: statKey, sourceId: srcId, targetId: destId } });
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
            engine.api.notifications.notify({ title: "Stat moved", message: `Moved ${statKey} from ${srcChar.set?.name || srcId} to ${destChar.set?.name || destId}.`, level: "info", source: "engine", category: "character.stats_cut", metadata: { operation: "cut", statId: statKey, sourceId: srcId, targetId: destId } });
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
            engine.api.notifications.notify({ title: "Stat removed", message: `Removed ${char.stats[statKey]?.label || statKey} from ${char.set?.name || targetId}.`, level: "info", source: "engine", category: "character.stats_removed", metadata: { operation: "delete", statId: statKey, targetId, oldValue: char.stats[statKey]?.current, oldMax: char.stats[statKey]?.max } });
        }
    },
    add: (engine, eff) => {
        const targetId = engine.redirectTarget(eff.target);
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: targetId });
        if (!char) return;

        // Reuse the shared stat parser/normalizer so character and item stats
        // have identical current/max/label/color semantics.
        if (StatsHelpers.add_stats(char, eff, true, targetId, engine)) {
            engine.api.engine.state.set('characters.[id]', char, { id: targetId });
        }
    },

};

export const CharacterStrategies = {
    edit_stats: (engine, eff) => {
        const field = eff.field || 'current';
        const mode = eff.mode || 'adjust';
        const charId = engine.redirectTarget(eff.target);
        const char = engine.api.engine.state.getRuntime('characters.[id]', { id: charId });
        if (!char) return;

        if (!char.stats) char.stats = {};

        if (field === 'unknown') {
            if (!['disable', 'enable'].includes(mode)) {
                throw new TypeError(`Unsupported characters.edit_stats mode: ${String(mode)} for field unknown`);
            }
            const property = resolveValue(eff.property, engine);
            const stat = char.stats[property];
            if (!stat || typeof stat !== 'object') return;

            // "enable" marks the stat as unknown (hidden); "disable" reveals it.
            stat.unknown = mode === 'enable';
            engine.api.engine.state.set('characters.[id]', char, { id: charId });

            const entryChar = engine.api.engine.state.getRuntime('meta.entryCharacter') || 'player';
            if (charId === entryChar) engine.api.presentation.components.updatePlayerCard();
            if (engine.api.presentation.updateContactDetails) {
                engine.api.presentation.updateContactDetails(charId);
            }
            return;
        }

        if (!['current', 'max'].includes(field) ||
            !['set', 'adjust', 'full'].includes(mode) ||
            (field === 'max' && mode === 'full')) {
            throw new TypeError(`Unsupported characters.edit_stats mode: ${String(mode)} for field ${String(field)}`);
        }

        // Delegate to StatsHelpers.edit_value on a detached character snapshot.
        StatsHelpers.edit_value(char, eff, true, charId, engine);
        engine.api.engine.state.set('characters.[id]', char, { id: charId });
    },
    mng_stats: (engine, eff) => {
        const handler = StatsLogic[eff.exec];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported characters.mng_stats operation: ${String(eff.exec)}`);
        }
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, engine),
            source: resolveValue(eff.source, engine),
            value: resolveValue(eff.value, engine)
        };
        handler(engine, resolvedEff);
    },
    mng_items: async (engine, eff) => {
        const handler = ItemTransferLogic[eff.exec];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported characters.mng_items operation: ${String(eff.exec)}`);
        }
        const resolvedEff = {
            ...eff,
            target: resolveValue(eff.target, engine),
            source: resolveValue(eff.source, engine),
            value: resolveValue(eff.value, engine)
        };
        await handler(engine, resolvedEff);
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
        const handler = MovingLogic[eff.exec];
        if (typeof handler !== 'function') {
            throw new TypeError(`Unsupported characters.moving operation: ${String(eff.exec)}`);
        }
        const indices = Array.isArray(eff.index) ? eff.index : (Number.isInteger(eff.index) ? [eff.index] : []);
        const changed = handler(char, resolvedEff, indices) === true;
        if (!changed) return;

        engine.api.engine.state.set('characters.[id]', char, { id: charId });
        engine.taskManager?.kill?.(`move_char_${charId}`);
        if (engine.validateMoveState(charId)) engine.scheduleCharacterMove(charId);
    }
};