/**
 * JSON-only client transport. It has no Engine import or Engine reference.
 * A host may be local, worker-backed, HTTP, or WebSocket as long as it
 * implements request(JSON) and subscribe(listener).
 */
import { JsonStateStore } from '../state/JsonStateStore.js';

const deepEqualTimeline = (a, b) => {
  if (Object.is(a, b)) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  return ak.length === bk.length && ak.every(key => Object.hasOwn(b, key) && deepEqualTimeline(a[key], b[key]));
};
export function evaluateSpriteEasing(easing, progress) {
  const t = Math.max(0, Math.min(1, Number(progress) || 0));
  switch (easing) {
    case 'linear': return t;
    case 'ease_in': return t * t;
    case 'ease_out': return 1 - (1 - t) * (1 - t);
    case 'ease_in_out': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'sin_in': return 1 - Math.cos((t * Math.PI) / 2);
    case 'sin_out': return Math.sin((t * Math.PI) / 2);
    case 'sin_in_out': return -(Math.cos(Math.PI * t) - 1) / 2;
    case 'step': return t >= 1 ? 1 : 0;
    default: throw new TypeError(`Unsupported Sprite easing: ${String(easing)}`);
  }
}

export function sampleSpriteMotion(motion, progress) {
  if (!isSpriteMotionPayload(motion)) throw new TypeError('Invalid Sprite motion descriptor.');
  const t = evaluateSpriteEasing(motion.easing, progress);
  const points = motion.path.points.map(point => [point.x, point.y, point.z]);
  if (motion.path.type !== 'bezier') throw new TypeError(`Unsupported Sprite path geometry: ${String(motion.path.type)}`);
  // Preserve the existing cubic Bezier sampling contract for all motion descriptors.
  const [p0, p1, p2, p3] = points;
  const u = 1 - t, weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const sampled = [0, 1, 2].map(axis =>
    weights[0] * p0[axis] + weights[1] * p1[axis] + weights[2] * p2[axis] + weights[3] * p3[axis]
  );
  if (motion.start && t === 0) return [motion.start.x, motion.start.y, motion.start.z];
  if (motion.end && t === 1) return [motion.end.x, motion.end.y, motion.end.z];
  return sampled;
}
function isFiniteSpritePoint(point) {
  return point && typeof point === 'object' && !Array.isArray(point) && ['x', 'y', 'z'].every(axis => typeof point[axis] === 'number' && Number.isFinite(point[axis]));
}
function isSpriteMotionPayload(payload) {
  const easings = ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'sin_in', 'sin_out', 'sin_in_out', 'step'];
  return payload && typeof payload.spriteId === 'string' && payload.spriteId.length > 0 &&
    typeof payload.motionId === 'string' && payload.motionId.length > 0 &&
    payload.path?.type === 'bezier' && Array.isArray(payload.path.points) &&
    payload.path.points.length === 4 && payload.path.points.every(isFiniteSpritePoint) &&
    Number.isFinite(payload.duration) && payload.duration >= 0 && easings.includes(payload.easing) &&
    (payload.geometryMode === undefined || ['geometry-preserving', 'absolute'].includes(payload.geometryMode)) &&
    (payload.impact === undefined || (payload.impact && typeof payload.impact.enable === 'boolean' && typeof payload.impact.physics === 'boolean'));
}
const timestampFromSnapshot = snapshot => {
  const parsed = Date.parse(snapshot?.createdAt || '');
  return Number.isFinite(parsed) ? parsed : Date.now();
};


export class JsonClient {
  constructor(transport) {
    if (!transport || typeof transport.request !== 'function' || typeof transport.subscribe !== 'function') {
      throw new TypeError('JsonClient requires a JSON transport.');
    }
    this.transport = transport;
    this.listeners = new Set();
    this.store = new JsonStateStore();
    this.snapshot = null;
    this.commandSequence = 0;
    this.eventCursor = null;
    this.resyncPromise = null;
    this.disposed = false;
    this.stackTimeLine = [];
    this.timelineSnapshot = null;
    this.timelineInitialized = false;
    this.timelineCommandIds = new Set();
    this.pendingActionCommands = new Map();
    this.timelineActionOutcomeCommandIds = new Set();
    this.timelineEndingKeys = new Set();
    this.pendingItemTransfers = new Map();
    this.timelineTransferCommandIds = new Set();
    this.transferredItemIds = new Set();
    this.unsubscribeTransport = transport.subscribe(raw => this.receive(raw));
  }

  receive(raw) {
    let message;
    try { message = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw); }
    catch (error) { this.emit({ type: 'transport.error', error }); return; }
    if (message?.type === 'event') {
      const engineChanged = !!(message.engineId && this.snapshot?.engineId && message.engineId !== this.snapshot.engineId);
      if (engineChanged) {
        this.resetTimelineForEngineChange();
        this.eventCursor = null;
        this.emit({ type: 'synchronization.engineChanged', previousEngineId: this.snapshot.engineId, engineId: message.engineId });
      }
      const sequence = Number.isSafeInteger(message.sequence) ? message.sequence : null;
      if (!engineChanged && sequence !== null && this.eventCursor !== null && sequence <= this.eventCursor) {
        this.emit({ type: 'event.duplicate', eventId: message.eventId, sequence });
        return;
      }
      const gap = !engineChanged && sequence !== null && this.eventCursor !== null && sequence > this.eventCursor + 1;
      const snapshotEvent = message.event === 'state.snapshot' && message.payload?.snapshot;
      if (gap) {
        this.processProtocolTimelineEvent(message);
        this.emit({ type: 'synchronization.gap', expected: this.eventCursor + 1, received: sequence });
        if (snapshotEvent) {
          this.eventCursor = sequence;
          this.processTimelineSnapshot(message.payload.snapshot);
          this.setSnapshot(message.payload.snapshot, message.payload.reason || 'state.changed');
          this.emit({ type: 'synchronization.recovered', source: 'event.snapshot', eventSequence: sequence });
          this.emit({ type: 'event', event: message });
        } else {
          // Do not apply potentially non-contiguous events or advance the cursor.
          this.resynchronize('event-gap').catch(error => this.emit({ type: 'synchronization.error', error }));
        }
        return;
      }
      if (engineChanged && !snapshotEvent) {
        this.resynchronize('engine-changed').catch(error => this.emit({ type: 'synchronization.error', error }));
        return;
      }
      if (sequence !== null) this.eventCursor = sequence;
      if (snapshotEvent) {
        this.processTimelineSnapshot(message.payload.snapshot);
        this.setSnapshot(message.payload.snapshot, message.payload.reason || 'state.changed');
        if (engineChanged) this.emit({ type: 'synchronization.recovered', source: 'event.snapshot', eventSequence: sequence });
      }
      this.processProtocolTimelineEvent(message);
      if (message.event === 'presentation.sprite.motion') {
        if (isSpriteMotionPayload(message.payload)) this.emit({ type: 'sprite.motion', motion: structuredClone(message.payload), eventId: message.eventId, sequence });
        else this.emit({ type: 'sprite.motion.invalid', payload: structuredClone(message.payload), eventId: message.eventId, sequence });
      }
      this.emit({ type: 'event', event: message });
    } else if (message?.type === 'snapshot') {
      if (this.snapshot?.engineId && message.engineId && this.snapshot.engineId !== message.engineId) this.resetTimelineForEngineChange();
      this.processTimelineSnapshot(message);
      this.setSnapshot(message, 'snapshot');
    } else if (message?.type === 'transport.error') {
      const error = new Error(message.message || 'JSON transport failed.');
      if (message.code) error.code = message.code;
      if (message.outcome) error.outcome = message.outcome;
      this.emit({ type: 'transport.error', error });
    }
  }
  resetTimelineForEngineChange() {
    if (!this.timelineInitialized && this.stackTimeLine.length === 0) return;
    this.stackTimeLine.length = 0;
    this.timelineSnapshot = null;
    this.timelineInitialized = false;
    this.timelineCommandIds.clear();
    this.pendingActionCommands.clear();
    this.timelineActionOutcomeCommandIds.clear();
    this.timelineEndingKeys.clear();
    this.pendingItemTransfers.clear();
    this.timelineTransferCommandIds.clear();
    this.transferredItemIds.clear();
    this.emit({ type: 'timeline.reset', reason: 'engine.changed' });
  }

  appendTimeline(event, timestamp = Date.now()) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('Timeline event must be an object.');
    if (!Number.isFinite(timestamp)) throw new TypeError('Timeline timestamp must be finite.');
    const previousTimestamp = this.stackTimeLine.at(-1)?.[0];
    const monotonicTimestamp = Number.isFinite(previousTimestamp) ? Math.max(timestamp, previousTimestamp) : timestamp;
    const entry = [monotonicTimestamp, structuredClone(event)];
    this.stackTimeLine.push(entry);
    this.emit({ type: 'timeline.append', entry: structuredClone(entry), index: this.stackTimeLine.length - 1 });
    return entry;
  }

  getTimeline() { return structuredClone(this.stackTimeLine); }

  clearTimeline() {
    this.stackTimeLine.length = 0;
    this.timelineSnapshot = null;
    this.timelineInitialized = false;
    this.timelineCommandIds.clear();
    this.pendingActionCommands.clear();
    this.timelineActionOutcomeCommandIds.clear();
    this.timelineEndingKeys.clear();
    this.pendingItemTransfers.clear();
    this.timelineTransferCommandIds.clear();
    this.transferredItemIds.clear();
    this.emit({ type: 'timeline.cleared' });
  }

  processProtocolTimelineEvent(message) {
    if (message.event === 'scenario.ended') {
      const ending = message.payload?.ending;
      if (ending) this.recordEnding(ending, message.timestamp);
    }
  }

  recordEnding(ending, timestamp) {
    const endingId = ending?.id || ending?.endingId || null;
    const key = endingId || `unknown:${ending?.activatedAt || ending?.timestamp || ''}`;
    if (this.timelineEndingKeys.has(key)) return;
    this.timelineEndingKeys.add(key);
    const parsedTimestamp = typeof timestamp === 'number' ? timestamp : (timestamp ? Date.parse(timestamp) : NaN);
    this.appendTimeline({ type: 'ending_activated', endingId, ending: ending ? structuredClone(ending) : null }, Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now());
  }

  processTimelineSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const previous = this.timelineSnapshot;
    if (previous?.engineId && snapshot.engineId === previous.engineId && Number.isInteger(previous.stateRevision) && Number.isInteger(snapshot.stateRevision) && snapshot.stateRevision < previous.stateRevision) return;
    if (!this.timelineInitialized || !previous || previous.engineId !== snapshot.engineId) {
      this.timelineInitialized = true;
      this.timelineSnapshot = structuredClone(snapshot);
      const sceneId = snapshot.game?.sceneId;
      const routerId = snapshot.game?.routerId;
      if (sceneId) this.appendTimeline({ type: 'scene_changed', sceneId, initial: true }, timestampFromSnapshot(snapshot));
      if (routerId) this.appendTimeline({ type: 'router_changed', sceneId: sceneId || null, routerId, initial: true }, timestampFromSnapshot(snapshot));
      if (snapshot.session?.chat?.active) this.appendTimeline({ type: 'chat_started', chatId: snapshot.session.chat.id || null, contactId: snapshot.session.chat.contactId || null, blockId: snapshot.session.chat.blockId || null, initial: true }, timestampFromSnapshot(snapshot));
      if (snapshot.presentation?.ending) this.recordEnding(snapshot.presentation.ending, snapshot.createdAt);
      return;
    }

    const timestamp = timestampFromSnapshot(snapshot);
    const oldGame = previous.game || {};
    const newGame = snapshot.game || {};
    if (oldGame.sceneId !== newGame.sceneId && newGame.sceneId) {
      this.appendTimeline({ type: 'scene_changed', sceneId: newGame.sceneId, previousSceneId: oldGame.sceneId || null }, timestamp);
    }
    if (oldGame.routerId !== newGame.routerId && newGame.routerId) {
      this.appendTimeline({ type: 'router_changed', sceneId: newGame.sceneId || null, routerId: newGame.routerId, previousRouterId: oldGame.routerId || null }, timestamp);
    }

    const oldEnding = previous.presentation?.ending || null;
    const newEnding = snapshot.presentation?.ending || null;
    if (!oldEnding && newEnding) this.recordEnding(newEnding, snapshot.createdAt);

    this.diffChat(previous, snapshot, timestamp);
    this.diffActions(previous, snapshot, timestamp);
    this.diffInventory(previous, snapshot, timestamp);
    this.diffCharacters(previous, snapshot, timestamp);
    const oldFaker = previous.state?.faker || {};
    const newFaker = snapshot.state?.faker || {};
    if (!oldFaker.active && newFaker.active) this.appendTimeline({ type: 'faker_entered', mode: newFaker.mode || null, targetId: newFaker.targetId || null }, timestamp);
    if (oldFaker.active && !newFaker.active) this.appendTimeline({ type: 'faker_exited', mode: oldFaker.mode || null, targetId: oldFaker.targetId || null }, timestamp);
    this.diffState(previous, snapshot, timestamp);
    this.timelineSnapshot = structuredClone(snapshot);
  }

  diffChat(previous, snapshot, timestamp) {
    const oldChat = previous.session?.chat || {};
    const newChat = snapshot.session?.chat || {};
    if (!oldChat.active && newChat.active) {
      this.appendTimeline({ type: 'chat_started', chatId: newChat.id || null, contactId: newChat.contactId || null, blockId: newChat.blockId || null }, timestamp);
    }
    const oldHistory = oldChat.history || {};
    const newHistory = newChat.history || {};
    const ids = new Set([...Object.keys(oldHistory), ...Object.keys(newHistory)]);
    for (const chatId of ids) {
      const oldLines = Array.isArray(oldHistory[chatId]) ? oldHistory[chatId] : [];
      const newLines = Array.isArray(newHistory[chatId]) ? newHistory[chatId] : [];
      if (newLines.length < oldLines.length) continue; // history reset/loop; don't invent replay events
      const appended = newLines.slice(oldLines.length);
      for (const line of appended) {
        const wasWaitingChoice = oldChat.waitingChoice === true && oldChat.id === chatId;
        if (wasWaitingChoice) {
          this.appendTimeline({ type: 'chat_choice_selected', chatId, text: line?.text || '', line: structuredClone(line) }, timestamp);
        } else {
          this.appendTimeline({ type: 'chat_dialogue', chatId, speakerId: line?.nameID || line?.char_id || null, text: line?.text || '', line: structuredClone(line) }, timestamp);
        }
      }
    }
    if (oldChat.active && !newChat.active) {
      this.appendTimeline({ type: 'chat_ended', chatId: oldChat.id || null, contactId: oldChat.contactId || null }, timestamp);
    }
  }

  diffActions(previous, snapshot, timestamp) {
    const oldActions = previous.presentation?.actions || [];
    const newActions = snapshot.presentation?.actions || [];
    const oldMap = new Map(oldActions.map(action => [action.id, action]));
    for (const action of newActions) {
      const old = oldMap.get(action.id);
      if (!old) continue;
      for (const phase of ['pass', 'fail', 'pwFailed']) {
        const delta = (action.count?.[phase] || 0) - (old.count?.[phase] || 0);
        if (delta <= 0) continue;
        for (let i = 0; i < delta; i++) {
          const type = phase === 'pass' ? 'action_passed' : phase === 'fail' ? 'action_failed' : 'action_password_failed';
          const pending = phase !== 'pwFailed' ? [...this.pendingActionCommands.entries()].find(([, pendingActionId]) => pendingActionId === action.id) : null;
          const commandId = pending?.[0] || null;
          if (commandId) this.timelineActionOutcomeCommandIds.add(commandId);
          this.appendTimeline({ type, actionId: action.id, actionTitle: action.title || action.name || action.id, ...(commandId ? { commandId } : {}) }, timestamp);
        }
      }
    }
  }

  diffInventory(previous, snapshot, timestamp) {
    const oldInventory = previous.presentation?.inventory || {};
    const newInventory = snapshot.presentation?.inventory || {};
    const oldItems = new Map((oldInventory.items || []).map(item => [item.id, item]));
    const newItems = new Map((newInventory.items || []).map(item => [item.id, item]));
    for (const [itemId, item] of newItems) {
      const old = oldItems.get(itemId);
      if (!old) {
        this.appendTimeline({ type: 'item_received', itemId, ownerId: newInventory.ownerId || null }, timestamp);
        continue;
      }
      if (old.equipped !== item.equipped) this.appendTimeline({ type: item.equipped ? 'item_equipped' : 'item_unequipped', itemId }, timestamp);
      if (old.usage && item.usage && old.usage.current !== item.usage.current) this.appendTimeline({ type: 'item_usage_changed', itemId, previous: old.usage.current, current: item.usage.current, max: item.usage.max }, timestamp);
      const oldStats = old.stats || [], newStats = item.stats || [];
      const oldStatMap = new Map(oldStats.map(stat => [stat.id, stat]));
      const newStatMap = new Map(newStats.map(stat => [stat.id, stat]));
      for (const [statId, stat] of newStatMap) {
        const prevStat = oldStatMap.get(statId);
        if (!prevStat) this.appendTimeline({ type: 'item_stat_added', itemId, statId, stat: structuredClone(stat) }, timestamp);
        else if (prevStat.current !== stat.current || prevStat.max !== stat.max) {
          if (prevStat.max !== stat.max) this.appendTimeline({ type: 'item_stat_max_changed', itemId, statId, previousMax: prevStat.max, max: stat.max }, timestamp);
          if (prevStat.current !== stat.current) this.appendTimeline({ type: stat.current > prevStat.current && stat.current >= stat.max ? 'item_stat_refilled' : 'item_stat_changed', itemId, statId, previous: prevStat.current, current: stat.current, max: stat.max }, timestamp);
        }
      }
      for (const statId of oldStatMap.keys()) if (!newStatMap.has(statId)) this.appendTimeline({ type: 'item_stat_removed', itemId, statId }, timestamp);
    }
    const transferItemIds = new Set([...this.pendingItemTransfers.values()].map(transfer => transfer.itemId));
    for (const itemId of oldItems.keys()) if (!newItems.has(itemId) && !transferItemIds.has(itemId) && !this.transferredItemIds.has(itemId)) this.appendTimeline({ type: 'item_removed', itemId, previousOwnerId: oldInventory.ownerId || null }, timestamp);
    for (const itemId of this.transferredItemIds) if (!newItems.has(itemId)) this.transferredItemIds.delete(itemId);
  }

  diffCharacters(previous, snapshot, timestamp) {
    const oldChars = previous.state?.characters || {};
    const newChars = snapshot.state?.characters || {};
    const ids = new Set([...Object.keys(oldChars), ...Object.keys(newChars)]);
    for (const characterId of ids) {
      const oldChar = oldChars[characterId] || {};
      const newChar = newChars[characterId] || {};
      const oldStats = oldChar.stats || {};
      const newStats = newChar.stats || {};
      const statIds = new Set([...Object.keys(oldStats), ...Object.keys(newStats)]);
      const changedStatIds = [...statIds].filter(statId => oldStats[statId] && newStats[statId] && !deepEqualTimeline(oldStats[statId], newStats[statId]));
      // Operation-level stat events are inferred from the resulting state. They are
      // marked inferred because snapshots cannot prove which effect operation ran.
      for (let i = 0; i < changedStatIds.length; i++) {
        for (let j = i + 1; j < changedStatIds.length; j++) {
          const aId = changedStatIds[i], bId = changedStatIds[j];
          const aOld = oldStats[aId], bOld = oldStats[bId], aNew = newStats[aId], bNew = newStats[bId];
          if (aOld.current === bNew.current && bOld.current === aNew.current && aOld.max === aNew.max && bOld.max === bNew.max) {
            this.appendTimeline({ type: 'character_stats_swapped', characterId, statA: aId, statB: bId, inferred: true }, timestamp);
          }
        }
      }
      for (const targetStatId of changedStatIds) {
        const targetNew = newStats[targetStatId];
        for (const sourceStatId of statIds) {
          if (sourceStatId === targetStatId || changedStatIds.includes(sourceStatId)) continue;
          if (deepEqualTimeline(targetNew, newStats[sourceStatId]) && !deepEqualTimeline(oldStats[targetStatId], oldStats[sourceStatId])) {
            this.appendTimeline({ type: 'character_stat_copied', characterId, sourceStatId, targetStatId, inferred: true }, timestamp);
            break;
          }
        }
      }
      for (const statId of statIds) {
        const oldStat = oldStats[statId];
        const newStat = newStats[statId];
        if (oldStat === undefined && newStat !== undefined) this.appendTimeline({ type: 'character_stat_added', characterId, statId, stat: structuredClone(newStat) }, timestamp);
        else if (newStat === undefined && oldStat !== undefined) this.appendTimeline({ type: 'character_stat_removed', characterId, statId, previous: structuredClone(oldStat) }, timestamp);
        else if (oldStat && newStat && (oldStat.current !== newStat.current || oldStat.max !== newStat.max)) {
          if (oldStat.max !== newStat.max) this.appendTimeline({ type: 'character_max_stat_changed', characterId, statId, previousMax: oldStat.max, max: newStat.max }, timestamp);
          if (oldStat.current !== newStat.current) this.appendTimeline({ type: newStat.current > oldStat.current && newStat.current >= newStat.max ? 'character_stat_refilled' : 'character_stat_changed', characterId, statId, previous: oldStat.current, current: newStat.current, max: newStat.max }, timestamp);
        }
      }
      const oldMet = Array.isArray(oldChar.met) ? oldChar.met : [];
      const newMet = Array.isArray(newChar.met) ? newChar.met : [];
      const metCounts = entries => {
        const counts = new Map();
        for (const entry of entries) {
          const [id, rawCount] = String(entry).split(':');
          const parsed = Number(rawCount);
          counts.set(id, Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 1);
        }
        return counts;
      };
      const oldMetCounts = metCounts(oldMet), newMetCounts = metCounts(newMet);
      for (const metId of new Set([...oldMetCounts.keys(), ...newMetCounts.keys()])) {
        const oldCount = oldMetCounts.get(metId) || 0, newCount = newMetCounts.get(metId) || 0;
        if (newCount > oldCount) this.appendTimeline({ type: 'character_met', characterId, metCharacterId: metId, count: newCount - oldCount }, timestamp);
        else if (newCount < oldCount) this.appendTimeline({ type: 'character_unmet', characterId, metCharacterId: metId, count: oldCount - newCount }, timestamp);
      }
      const oldRelationships = Array.isArray(oldChar.relationship) ? oldChar.relationship : [];
      const newRelationships = Array.isArray(newChar.relationship) ? newChar.relationship : [];
      const relKey = rel => Array.isArray(rel) ? `${rel[0] || ''}:${rel[1] || ''}` : `${rel?.tag || ''}:${rel?.characterId || ''}`;
      const oldRel = new Set(oldRelationships.map(relKey));
      const newRel = new Set(newRelationships.map(relKey));
      if (oldRel.size && !newRel.size) this.appendTimeline({ type: 'relationships_cleared', characterId }, timestamp);
      else {
        for (const rel of newRelationships) if (!oldRel.has(relKey(rel))) this.appendTimeline({ type: 'relationship_added', characterId, relationship: structuredClone(rel) }, timestamp);
        for (const rel of oldRelationships) if (!newRel.has(relKey(rel))) this.appendTimeline({ type: 'relationship_removed', characterId, relationship: structuredClone(rel) }, timestamp);
      }
      const oldPlace = oldChar.place || {};
      const newPlace = newChar.place || {};
      if (!deepEqualTimeline(oldPlace, newPlace)) this.appendTimeline({ type: 'character_movement_state_changed', characterId, previous: structuredClone(oldPlace), current: structuredClone(newPlace) }, timestamp);
      const oldMoving = oldChar.moving;
      const newMoving = newChar.moving;
      if (!deepEqualTimeline(oldMoving, newMoving)) {
        const type = !oldMoving && newMoving ? 'character_movement_started' : oldMoving && !newMoving ? 'character_movement_stopped' : 'character_movement_state_changed';
        this.appendTimeline({ type, characterId, previous: structuredClone(oldMoving ?? null), current: structuredClone(newMoving ?? null) }, timestamp);
      }
      // Generic character property changes, excluding fields represented by dedicated events.
      const excluded = new Set(['stats', 'met', 'relationship', 'place', 'moving']);
      const changed = [...new Set([...Object.keys(oldChar), ...Object.keys(newChar)])].filter(key => !excluded.has(key) && !deepEqualTimeline(oldChar[key], newChar[key]));
      for (const property of changed) this.appendTimeline({ type: 'character_property_changed', characterId, property, previous: structuredClone(oldChar[property] ?? null), current: structuredClone(newChar[property] ?? null) }, timestamp);
    }
    // Detect likely cut/transfer operations when one Character loses exactly the
    // amount another gains for the same stat in one committed snapshot.
    for (const sourceId of ids) for (const targetId of ids) {
      if (sourceId === targetId) continue;
      const sourceOld = oldChars[sourceId]?.stats || {}, sourceNew = newChars[sourceId]?.stats || {};
      const targetOld = oldChars[targetId]?.stats || {}, targetNew = newChars[targetId]?.stats || {};
      for (const statId of new Set([...Object.keys(sourceOld), ...Object.keys(sourceNew)])) {
        const so = sourceOld[statId], sn = sourceNew[statId], to = targetOld[statId], tn = targetNew[statId];
        if (!so || !sn || !to || !tn || so.max !== sn.max || to.max !== tn.max) continue;
        const lost = Number(so.current) - Number(sn.current), gained = Number(tn.current) - Number(to.current);
        if (lost > 0 && lost === gained) this.appendTimeline({ type: 'character_stat_transferred', sourceCharacterId: sourceId, targetCharacterId: targetId, statId, amount: lost, inferred: true }, timestamp);
      }
    }
  }

  diffState(previous, snapshot, timestamp) {
    const oldState = previous.state || {};
    const newState = snapshot.state || {};
    const excluded = new Set(['characters', 'sceneId', 'scenes', 'routers', 'actions', 'chatHistory', 'itemInfo']);
    for (const key of new Set([...Object.keys(oldState), ...Object.keys(newState)])) {
      if (excluded.has(key) || deepEqualTimeline(oldState[key], newState[key])) continue;
      this.appendTimeline({ type: 'game_state_changed', key, previous: structuredClone(oldState[key] ?? null), current: structuredClone(newState[key] ?? null) }, timestamp);
    }
    const oldScenes = oldState.scenes || {};
    const newScenes = newState.scenes || {};
    for (const sceneId of new Set([...Object.keys(oldScenes), ...Object.keys(newScenes)])) {
      const oldScene = oldScenes[sceneId] || {};
      const newScene = newScenes[sceneId] || {};
      for (const property of new Set([...Object.keys(oldScene), ...Object.keys(newScene)])) {
        if (property === 'activeRouterId' || deepEqualTimeline(oldScene[property], newScene[property])) continue;
        this.appendTimeline({ type: 'scene_property_changed', sceneId, property, previous: structuredClone(oldScene[property] ?? null), current: structuredClone(newScene[property] ?? null) }, timestamp);
      }
      const oldRouter = oldScene.activeRouterId || null;
      const newRouter = newScene.activeRouterId || null;
      if (oldRouter === newRouter && deepEqualTimeline(oldScene.router, newScene.router)) continue;
      if (oldRouter !== newRouter) continue; // emitted as router_changed above
      if (!deepEqualTimeline(oldScene.router, newScene.router)) this.appendTimeline({ type: 'router_property_changed', sceneId, routerId: newRouter, previous: structuredClone(oldScene.router ?? null), current: structuredClone(newScene.router ?? null) }, timestamp);
    }
    const oldRouters = oldState.routers || {};
    const newRouters = newState.routers || {};
    for (const routerKey of new Set([...Object.keys(oldRouters), ...Object.keys(newRouters)])) {
      const oldRouterState = oldRouters[routerKey] || {};
      const newRouterState = newRouters[routerKey] || {};
      for (const property of new Set([...Object.keys(oldRouterState), ...Object.keys(newRouterState)])) {
        if (deepEqualTimeline(oldRouterState[property], newRouterState[property])) continue;
        this.appendTimeline({ type: 'router_property_changed', routerKey, property, previous: structuredClone(oldRouterState[property] ?? null), current: structuredClone(newRouterState[property] ?? null) }, timestamp);
      }
    }
  }

  emit(message) {
    for (const listener of this.listeners) listener(message);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    if (this.disposed) throw new Error('JsonClient is disposed.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSnapshot(snapshot, reason) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    const previous = this.snapshot;
    const sameEngine = previous?.engineId && snapshot.engineId && previous.engineId === snapshot.engineId;
    const incomingRevision = Number.isSafeInteger(snapshot.stateRevision) ? snapshot.stateRevision : null;
    const previousRevision = Number.isSafeInteger(previous?.stateRevision) ? previous.stateRevision : null;
    if (sameEngine && incomingRevision !== null && previousRevision !== null && incomingRevision < previousRevision) {
      this.emit({ type: 'snapshot.stale', reason, engineId: snapshot.engineId, stateRevision: incomingRevision, currentStateRevision: previousRevision });
      return false;
    }
    if (previous?.engineId && snapshot.engineId && previous.engineId !== snapshot.engineId) {
      this.eventCursor = null;
      this.emit({ type: 'synchronization.engineChanged', previousEngineId: previous.engineId, engineId: snapshot.engineId });
    }
    this.store.update(snapshot, reason);
    this.snapshot = this.store.getSnapshot();
    if (Number.isSafeInteger(snapshot.eventSequence) &&
        (this.eventCursor === null || snapshot.eventSequence > this.eventCursor)) {
      this.eventCursor = snapshot.eventSequence;
    }
    const changedKeys = this.store.lastUpdate?.changedKeys || [];
    this.emit({ type: 'state', reason, snapshot: this.snapshot, changedKeys });
    return true;
  }

  getSnapshot() { return this.store.getSnapshot(); }

  /** Return the active Sprite presentation projection, independent of Engine internals. */
  getSprites() {
    const sprites = this.getSnapshot()?.presentation?.sprites;
    return Array.isArray(sprites) ? structuredClone(sprites) : [];
  }

  /** Return one Sprite presentation projection by ID, or null when absent. */
  getSprite(spriteId) {
    if (typeof spriteId !== 'string' || !spriteId) return null;
    return this.getSprites().find(sprite => sprite?.id === spriteId) || null;
  }

  select(selector) { return this.store.select(selector); }

  subscribeSelector(selector, listener, equalityFn = Object.is) {
    return this.store.subscribeSelector(selector, listener, equalityFn);
  }

  inspectScenario(scenario) {
    return this.dispatch('scenario.inspect', { scenario });
  }

  async initialize(scenario, { enterScene = true } = {}) {
    this.clearTimeline();
    const acknowledgement = await this.dispatch('engine.init', { script: scenario, enterScene });
    const snapshot = this.getSnapshot();
    if (!snapshot?.game?.initialized) {
      throw new Error(acknowledgement.result?.message || 'Engine did not publish an initialized JSON snapshot.');
    }
    return snapshot;
  }

  async dispatch(name, payload = {}, { includeRevision = true, commandId } = {}) {
    if (this.disposed) throw new Error('JsonClient is disposed.');
    const command = {
      protocol: 'vsr',
      protocolVersion: this.snapshot?.protocolVersion || 2,
      type: 'command',
      commandId: commandId || `client_${Date.now().toString(36)}_${(++this.commandSequence).toString(36)}`,
      command: name,
      payload: structuredClone(payload)
    };
    if (includeRevision && Number.isInteger(this.snapshot?.stateRevision)) command.expectedStateRevision = this.snapshot.stateRevision;
    if (name === 'inventory.transfer' && typeof payload.itemId === 'string' && !this.timelineTransferCommandIds.has(command.commandId)) {
      this.timelineTransferCommandIds.add(command.commandId);
      this.pendingItemTransfers.set(command.commandId, { itemId: payload.itemId, targetCharacterId: payload.targetCharacterId || null });
    }
    if (name === 'action.trigger' && !this.timelineCommandIds.has(command.commandId)) {
      this.timelineCommandIds.add(command.commandId);
      this.pendingActionCommands.set(command.commandId, payload.actionId || null);
      this.appendTimeline({ type: 'action_attempted', actionId: payload.actionId || null, uniqueId: payload.uniqueId || null, commandId: command.commandId });
    }
    let ack;
    try {
      ack = JSON.parse(await this.transport.request(JSON.stringify(command)));
      if (name === 'inventory.transfer') {
        const transfer = this.pendingItemTransfers.get(command.commandId);
        if (transfer && ack?.ok === true && ack.result?.success !== false) {
          this.transferredItemIds.add(transfer.itemId);
          this.appendTimeline({ type: 'item_transferred', itemId: transfer.itemId, targetCharacterId: transfer.targetCharacterId, result: structuredClone(ack.result || null) });
        }
        this.pendingItemTransfers.delete(command.commandId);
      }
      if (name === 'password.submit' && ack?.ok === true && ack.result?.success === false && ack.result?.retry === true) {
        const actionId = this.snapshot?.session?.passwordChallenge?.actionId || null;
        const latest = this.stackTimeLine.at(-1)?.[1];
        if (!(latest?.type === 'action_password_failed' && latest.actionId === actionId)) {
          this.appendTimeline({ type: 'action_password_failed', actionId, challengeId: payload.challengeId || null, remainingAttempts: ack.result.remainingAttempts ?? null, result: structuredClone(ack.result) });
        }
      }
      if (name === 'action.trigger' && ack?.ok === false) {
        const reason = ack.error?.code || ack.error?.message || 'command_failed';
        if (!this.timelineActionOutcomeCommandIds.has(command.commandId)) {
          const type = reason === 'FORBIDDEN' ? 'action_permission_denied' : 'action_failed';
          this.appendTimeline({ type, actionId: payload.actionId || null, reason, commandId: command.commandId });
          this.timelineActionOutcomeCommandIds.add(command.commandId);
        }
      } else if (name === 'action.trigger' && ack?.ok === true) {
        const result = ack.result || {};
        const reason = result.reason || null;
        if (result.success === true && !this.timelineActionOutcomeCommandIds.has(command.commandId)) {
          this.appendTimeline({ type: 'action_passed', actionId: payload.actionId || null, commandId: command.commandId, result: structuredClone(result) });
          this.timelineActionOutcomeCommandIds.add(command.commandId);
        } else if (result.success === false && !this.timelineActionOutcomeCommandIds.has(command.commandId)) {
          const type = reason === 'permission_denied' ? 'action_permission_denied' : ['expired', 'exhausted', 'password_failed'].includes(reason) ? 'action_password_failed' : reason === 'requirement_failed' ? 'action_failed' : 'action_execution_rejected';
          this.appendTimeline({ type, actionId: payload.actionId || null, reason, commandId: command.commandId, result: structuredClone(result) });
          this.timelineActionOutcomeCommandIds.add(command.commandId);
        }
      }
      if (name === 'action.trigger') this.pendingActionCommands.delete(command.commandId);

    } catch (error) {
      this.pendingItemTransfers.delete(command.commandId);
      if (error.outcome === 'not-sent') this.pendingActionCommands.delete(command.commandId);
      error.commandId = command.commandId;
      error.command = name;
      // A transport error after send is an unknown outcome. Never auto-replay.
      if (error.outcome !== 'not-sent') {
        error.outcome = error.outcome || 'unknown';
        error.message = `${error.message || 'Command transport failed.'} The command outcome is unknown; the Engine may have applied it. Do not retry with a new command ID. Refresh runtime state before deciding whether to retry.`;
      }
      throw error;
    }
    if (!ack.ok) throw Object.assign(new Error(ack.error?.message || ack.error?.code || 'Command failed.'), { code: ack.error?.code, acknowledgement: ack });
    return ack;
  }

  async refreshSnapshot() {
    const acknowledgement = await this.dispatch('snapshot.get', {}, { includeRevision: false });
    if (acknowledgement.result?.type !== 'snapshot') throw new Error('Engine did not return a valid snapshot.');
    this.processTimelineSnapshot(acknowledgement.result);
    this.setSnapshot(acknowledgement.result, 'snapshot.refresh');
    return this.getSnapshot();
  }

  resynchronize(reason = 'manual') {
    if (this.resyncPromise) return this.resyncPromise;
    this.emit({ type: 'synchronization.started', reason });
    this.resyncPromise = this.refreshSnapshot()
      .then(snapshot => {
        this.emit({ type: 'synchronization.recovered', source: 'snapshot.get', reason, eventSequence: snapshot?.eventSequence });
        return snapshot;
      })
      .finally(() => { this.resyncPromise = null; });
    return this.resyncPromise;
  }

  acknowledge(requestId, response = {}) {
    if (typeof this.transport.acknowledge !== 'function') return false;
    return this.transport.acknowledge(requestId, response);
  }

  triggerAction(actionId, uniqueId) { return this.dispatch('action.trigger', { actionId, uniqueId }); }
  triggerSprite(spriteId, uniqueId) { return this.dispatch('sprite.trigger', { spriteId, uniqueId }); }
  completeSpriteMotion(spriteId, motionId, reason = 'completed') { return this.dispatch('sprite.motion.complete', { spriteId, motionId, reason }); }
  reportSpriteImpact(spriteId, targetSpriteId, motionId, contact = {}) { return this.dispatch('sprite.motion.impact', { spriteId, targetSpriteId, motionId, contact }); }
  markActionRead(uniqueId) { return this.dispatch('action.markAsRead', { uniqueId }); }
  openChatThread(contactId, chatId) { return this.dispatch('chat.open', { contactId, chatId }); }
  nextChat() { return this.dispatch('chat.next'); }
  selectChatChoice(index) { return this.dispatch('chat.selectChoice', { index }); }
  toggleHand(itemId) { return this.dispatch('inventory.toggleHand', { itemId }); }
  removeInventoryItem(itemId) { return this.dispatch('inventory.remove', { itemId }); }
  transferInventoryItem(itemId, targetCharacterId) { return this.dispatch('inventory.transfer', { itemId, targetCharacterId }); }
  useItem(itemId) { return this.dispatch('item.use', { itemId }); }
  enterScene(sceneId, skipTransition = false) { return this.dispatch('scene.enter', { sceneId, skipTransition }); }
  backParent() { return this.dispatch('scene.backParent'); }
  submitPassword(challengeId, input, cancel = false) { return this.dispatch('password.submit', { challengeId, input, cancel }); }
  pause() { return this.dispatch('engine.pause'); }
  resume() { return this.dispatch('engine.resume'); }
  exportSave() { return this.dispatch('save.export'); }
  restoreSave(save) { return this.dispatch('save.restore', { save }); }
  markNotificationRead(notificationId) { return this.dispatch('notification.read', { notificationId }); }
  markAllNotificationsRead(source) { return this.dispatch('notification.readAll', source ? { source } : {}); }
  dismissNotification(notificationId) { return this.dispatch('notification.dismiss', { notificationId }); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeTransport?.();
    this.listeners.clear();
  }
}
