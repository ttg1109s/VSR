/**
 * VSR JSON Protocol
 *
 * Hybrid transport: serializable snapshots + ordered events + validated commands.
 * This module has no DOM, browser UI, or Engine imports and can run headlessly.
 */

const RUNTIME_ONLY_STATE_KEYS = new Set([
    'effectQueue',
    'isSyncQueueRunning',
    'isAsyncQueueRunning',
    'pausedBackgroundTasks'
]);

function cloneJsonValue(value, seen = new WeakSet()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new TypeError('Protocol JSON cannot contain non-finite numbers.');
        return value;
    }
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
        return undefined;
    }
    if (typeof value !== 'object') throw new TypeError(`Unsupported protocol value: ${typeof value}`);
    if (seen.has(value)) throw new TypeError('Protocol JSON cannot contain circular references.');
    seen.add(value);

    let result;
    if (Array.isArray(value)) {
        result = value.map(item => {
            const cloned = cloneJsonValue(item, seen);
            return cloned === undefined ? null : cloned;
        });
    } else if (value instanceof Date) {
        result = value.toISOString();
    } else {
        result = {};
        Object.keys(value).forEach(key => {
            const cloned = cloneJsonValue(value[key], seen);
            if (cloned !== undefined) result[key] = cloned;
        });
    }

    seen.delete(value);
    return result;
}

function createId(prefix, sequence) {
    return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`;
}

export class JsonProtocol {
    constructor({ engineId = 'vsr-engine', protocolVersion = 1 } = {}) {
        this.engineId = engineId;
        this.protocolVersion = protocolVersion;
        this.revision = 0;
        this.eventSequence = 0;
        this.commandSequence = 0;
        this.listeners = new Set();
        this.eventLog = [];
        this.maxEvents = 1000;
        this.commandHandlers = new Map();
        this.commandResults = new Map();
        this.maxRememberedCommands = 500;
    }

    subscribe(listener) {
        if (typeof listener !== 'function') throw new TypeError('Protocol listener must be a function.');
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    registerCommand(name, handler) {
        if (typeof name !== 'string' || !name.trim()) throw new TypeError('Command name is required.');
        if (typeof handler !== 'function') throw new TypeError('Command handler must be a function.');
        this.commandHandlers.set(name, handler);
        return () => this.commandHandlers.delete(name);
    }

    createSnapshot(engine, { includeSource = false } = {}) {
        if (!engine || !engine.state) throw new Error('Engine state is not initialized.');
        const state = {};
        Object.keys(engine.state).forEach(key => {
            if (RUNTIME_ONLY_STATE_KEYS.has(key)) return;
            const value = cloneJsonValue(engine.state[key]);
            if (value !== undefined) state[key] = value;
        });

        const snapshot = {
            protocol: 'vsr',
            protocolVersion: this.protocolVersion,
            type: 'snapshot',
            engineId: this.engineId,
            revision: this.revision,
            createdAt: new Date().toISOString(),
            game: {
                initialized: !!engine.src,
                sceneId: engine.state.sceneId || null,
                routerId: engine.state.sceneId
                    ? (engine.state.scenes?.[engine.state.sceneId]?.activeRouterId || null)
                    : null
            },
            state
        };

        if (includeSource && engine.src) snapshot.source = cloneJsonValue(engine.src);
        return snapshot;
    }

    getEventsSince(revision = 0) {
        if (!Number.isInteger(revision) || revision < 0) {
            throw new TypeError('revision must be a non-negative integer.');
        }
        const earliestRevision = this.eventLog[0]?.revision ?? (this.revision + 1);
        if (revision < earliestRevision - 1) {
            return {
                gap: true,
                currentRevision: this.revision,
                events: []
            };
        }
        return {
            gap: false,
            currentRevision: this.revision,
            events: this.eventLog.filter(event => event.revision > revision).map(event => cloneJsonValue(event))
        };
    }

    publish(type, payload = {}, engine = null) {
        if (typeof type !== 'string' || !type.trim()) throw new TypeError('Event type is required.');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new TypeError('Event payload must be a JSON object.');
        }
        const safePayload = cloneJsonValue(payload);
        this.revision += 1;
        const event = {
            protocol: 'vsr',
            protocolVersion: this.protocolVersion,
            type: 'event',
            engineId: this.engineId,
            eventId: createId('evt', ++this.eventSequence),
            sequence: this.eventSequence,
            revision: this.revision,
            timestamp: new Date().toISOString(),
            event: type,
            payload: safePayload === undefined ? {} : safePayload
        };

        this.eventLog.push(event);
        if (this.eventLog.length > this.maxEvents) this.eventLog.shift();

        this.listeners.forEach(listener => {
            try { listener(cloneJsonValue(event)); }
            catch (error) { console.error('[VSR Protocol] Event listener failed:', error); }
        });
        return cloneJsonValue(event);
    }

    publishSnapshot(engine, reason = 'state.changed') {
        const snapshot = this.createSnapshot(engine);
        snapshot.revision = this.revision + 1;
        const event = this.publish('state.snapshot', { reason, snapshot });
        return cloneJsonValue(event.payload.snapshot);
    }

    async dispatch(command, context = {}) {
        if (!command || typeof command !== 'object' || Array.isArray(command)) {
            throw new TypeError('Command must be a JSON object.');
        }
        if (command.protocol !== 'vsr' || command.protocolVersion !== this.protocolVersion ||
            command.type !== 'command' || typeof command.command !== 'string') {
            throw new TypeError('Invalid or unsupported VSR command envelope.');
        }
        if (typeof command.commandId !== 'string' || !command.commandId.trim()) {
            throw new TypeError('commandId is required for idempotent command handling.');
        }

        if (this.commandResults.has(command.commandId)) {
            return cloneJsonValue(this.commandResults.get(command.commandId));
        }
        if (command.expectedRevision !== undefined && command.expectedRevision !== this.revision) {
            return {
                protocol: 'vsr',
                protocolVersion: this.protocolVersion,
                type: 'ack',
                commandId: command.commandId,
                ok: false,
                error: { code: 'REVISION_CONFLICT', expected: command.expectedRevision, actual: this.revision }
            };
        }

        const handler = this.commandHandlers.get(command.command);
        if (!handler) {
            return {
                protocol: 'vsr',
                protocolVersion: this.protocolVersion,
                type: 'ack',
                commandId: command.commandId,
                ok: false,
                error: { code: 'UNKNOWN_COMMAND', command: command.command }
            };
        }

        if (command.payload !== undefined &&
            (!command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload))) {
            throw new TypeError('Command payload must be a JSON object.');
        }
        const payload = command.payload === undefined ? {} : cloneJsonValue(command.payload);
        this.publish('command.accepted', { commandId: command.commandId, command: command.command });
        let result;
        try {
            result = await handler(payload, context);
            result = result === undefined ? null : cloneJsonValue(result);
        } catch (error) {
            this.publish('command.failed', {
                commandId: command.commandId,
                command: command.command,
                message: error?.message || String(error)
            });
            const failed = {
                protocol: 'vsr',
                protocolVersion: this.protocolVersion,
                type: 'ack',
                commandId: command.commandId,
                ok: false,
                error: { code: 'COMMAND_FAILED', message: error?.message || String(error) },
                revision: this.revision
            };
            this.commandResults.set(command.commandId, failed);
            return failed;
        }
        this.publish('command.completed', { commandId: command.commandId, command: command.command });
        const ack = {
            protocol: 'vsr',
            protocolVersion: this.protocolVersion,
            type: 'ack',
            commandId: command.commandId,
            ok: true,
            revision: this.revision,
            result
        };
        this.commandResults.set(command.commandId, ack);
        if (this.commandResults.size > this.maxRememberedCommands) {
            this.commandResults.delete(this.commandResults.keys().next().value);
        }
        return cloneJsonValue(ack);
    }

    createCommand(command, payload = {}, { commandId, expectedRevision } = {}) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new TypeError('Command payload must be a JSON object.');
        }
        const envelope = {
            protocol: 'vsr',
            protocolVersion: this.protocolVersion,
            type: 'command',
            commandId: commandId || createId('cmd', ++this.commandSequence),
            command,
            payload: cloneJsonValue(payload)
        };
        if (expectedRevision !== undefined) envelope.expectedRevision = expectedRevision;
        return envelope;
    }
}

export { cloneJsonValue };
