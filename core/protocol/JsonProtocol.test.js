import { JsonProtocol } from './JsonProtocol.js';
import { verifyPassword } from '../../password/verify.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const protocol = new JsonProtocol({ engineId: 'test-engine' });
const engine = {
    src: { meta: { title: 'Test' } },
    state: {
        sceneId: 'scene_1',
        scenes: { scene_1: { activeRouterId: 'router_1' } },
        effectQueue: { sync: [{ resolve() {} }], async: [] },
        isSyncQueueRunning: true,
        characters: { player: { inventory: [] } }
    }
};

const snapshot = protocol.createSnapshot(engine);
assert(snapshot.protocol === 'vsr', 'snapshot envelope');
assert(snapshot.game.routerId === 'router_1', 'scene projection');
assert(!('effectQueue' in snapshot.state), 'runtime queue excluded');
assert(JSON.stringify(snapshot).includes('scene_1'), 'snapshot is JSON serializable');

let received = null;
protocol.subscribe(event => { received = event; });
const event = protocol.publishSnapshot(engine, 'test');
assert(received === event, 'event delivered');
assert(event.revision === 1, 'revision increments');
assert(event.payload.snapshot.state.sceneId === 'scene_1', 'snapshot event payload');
assert(event.payload.snapshot.revision === event.revision, 'snapshot and event revisions align');
assert(protocol.getEventsSince(0).events.length === 1, 'event replay returns ordered event');
assert(protocol.getEventsSince(0).gap === false, 'event replay has no gap');

let executions = 0;
protocol.registerCommand('test.increment', payload => {
    executions += payload.amount;
    return executions;
});
const command = protocol.createCommand('test.increment', { amount: 2 }, { commandId: 'cmd-1' });
const first = await protocol.dispatch(command);
const replay = await protocol.dispatch(command);
assert(first.ok && first.result === 2, 'command executed');
assert(replay.result === 2 && executions === 2, 'duplicate command is idempotent');

const conflict = await protocol.dispatch(
    protocol.createCommand('test.increment', { amount: 1 }, { commandId: 'cmd-2', expectedRevision: 99 })
);
assert(!conflict.ok && conflict.error.code === 'REVISION_CONFLICT', 'revision conflict');

const unknown = await protocol.dispatch(protocol.createCommand('test.unknown', {}, { commandId: 'cmd-3' }));
assert(!unknown.ok && unknown.error.code === 'UNKNOWN_COMMAND', 'unknown command rejected');

let circular = {};
circular.self = circular;
let circularRejected = false;
try { protocol.publish('test.circular', circular); } catch (_) { circularRejected = true; }
assert(circularRejected, 'circular event payload rejected');

let invalidCommandRejected = false;
try { protocol.createCommand('test.invalid', []); } catch (_) { invalidCommandRejected = true; }
assert(invalidCommandRejected, 'non-object command payload rejected');

assert(verifyPassword('string', { value: 'OpenAI' }, 'openai'), 'string password is case insensitive');
assert(verifyPassword('puzzle', { value: 'solved' }, 'solved'), 'puzzle solved token');
assert(verifyPassword('find_way', { street: [[0, 0], [1, 0]] }, '[[0,0],[1,0]]'), 'find-way path');
assert(!verifyPassword('find_way', { street: [[0, 0], [1, 0]] }, '[[0,0],[0,1]]'), 'invalid find-way path rejected');

console.log('VSR JSON Protocol tests: PASS');
