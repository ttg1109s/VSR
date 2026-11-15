# VSR Engine

VSR is a headless interactive-story runtime. The repository retains React 19 as an optional host integration/runtime dependency, but ships no application UI, DOM renderer, component library, design system, or presentation stylesheet. A host may consume the Engine directly or use the JSON client adapters.

## Requirements

- Node.js 20 or newer.
- React 19 and React DOM 19 remain installed for React-based host integration.
- The Engine itself does not require React or a browser DOM.

## Engine package entry points

- `vsr-engine` — Engine exports from `engine/index.js`.
- `vsr-engine/protocol` — JSON protocol implementation.
- `vsr-engine/scenario-schema` — canonical scenario schema.
- `vsr-engine/scenario` — scenario loader and model utilities.
- `vsr-engine/save-schema` — save-envelope schema.
- `vsr-engine/state` — StateAccess implementation.
- `vsr-engine/utils` — reusable utility facade.
- `vsr-engine/host` — local in-process host.
- `vsr-engine/client` — JSON client adapter.
- `vsr-engine/transport` — Worker JSON transport adapter.

## Run quality checks

```sh
npm install
npm test
npm run schema:check
npm run audit:state:strict
npm run check:server
```

`npm run build` validates the minimal React host entry through Vite. The entry intentionally renders no visible interface.

## Basic Engine usage

```js
import { GameEngine } from './engine/index.js';

const engine = new GameEngine();
await engine.init(structuredClone(scenario));

const snapshot = engine.protocol.createSnapshot(engine);
const unsubscribe = engine.protocol.subscribe(event => {
  // Forward JSON events to the consuming host.
  console.log(event);
});

const acknowledgement = await engine.dispatchProtocolCommand(
  engine.protocol.createCommand('scene.enter', {
    sceneId: 'scene_gallery',
    skipTransition: true
  })
);

unsubscribe();
engine.dispose();
```

## React host integration

React is retained as an optional host runtime, not as a bundled product interface. A consuming application can mount its own components and communicate with the Engine through the JSON boundary:

```js
import { JsonClient } from './client/adapters/JsonClient.js';
import { WorkerJsonTransport } from './client/adapters/WorkerJsonTransport.js';

const transport = new WorkerJsonTransport();
const client = new JsonClient(transport);

await client.initialize(scenario);
const snapshot = client.getSnapshot();

client.subscribe(message => {
  if (message.type === 'state') {
    // Feed the immutable JSON snapshot into the host's own state layer.
  }
});

await client.triggerAction('action-id', 'unique-action-id');

// On host teardown:
client.dispose();
transport.close();
```

The Worker owns the `GameEngine`; the main thread receives only JSON acknowledgements, snapshots, and protocol events. The adapters do not define or render UI.

## Presentation boundary

Engine modules do not render UI or access browser DOM APIs. Notifications, chat updates, transitions, visual-effect requests, and input requests are emitted as presentation events. Consumers may ignore, log, persist, or interpret these events using their own host technology.

## Security boundary

Browser-native execution exposes shipped scenario data, password definitions, answers, and client-side game logic to the player. A Web Worker isolates execution from the host thread but does not provide secrecy or tamper resistance. Use a trusted backend for authoritative multiplayer, competitive scoring, protected unlocks, or puzzles whose answers must remain secret.

## Scenario schema is the source of truth

`scenario.schema.json` is the canonical Draft-07 contract. `engine/scenario/ScenarioSchema.js` is generated from it and must not be edited independently. Run `npm run schema:sync` to regenerate it and `npm run schema:check` to verify parity.

Scenario loading clones JSON-compatible input, applies declared defaults, assigns deterministic IDs to inline actions, validates the JSON Schema and cross-object domain invariants, and then builds runtime indexes. Unsupported future or legacy scenario versions are rejected rather than interpreted heuristically.

## Runtime ownership

Each `GameEngine` instance owns its API facade, protocol, gameplay state, session state, orchestration state, and `TaskManager`. Create one Engine per game session. Call `engine.dispose()` when disposing the instance to stop scheduled work and timers.

## State access

The StateAccess facade provides explicit reads, writes, deletes, snapshots, and serialized transactions across source, runtime, and session namespaces. Scenario source is read-only through this interface. Prefer snapshot methods for read-only consumers.

## Verification

Run `npm test`, `npm run schema:check`, `npm run audit:state:strict`, and `npm run check:server`. CI validates these checks against the headless runtime and adapter boundary.
