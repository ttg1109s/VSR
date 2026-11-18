# VSR Engine

VSR is a headless, framework-agnostic interactive-story runtime. This repository contains the game engine, JSON protocol, client/transport adapters, and optional server integration. It does not ship a product UI, UI framework, DOM renderer, component library, design system, or presentation stylesheet.

## Requirements

- Node.js 20 or newer.
- The Engine core does not require React, a browser DOM, or a presentation framework.

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

## Host integration

A consuming application can use the JSON client and transport adapters with any presentation technology, or consume the Engine directly:

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

## Task scheduling

Use the Engine-owned `taskManager` for delayed work that belongs to the game session. `once(callback, ms, name?)` schedules a callback exactly once and returns a cancellable handle:

```js
const expiryTask = engine.taskManager.once(() => {
  expireChallenge();
}, 5_000);

// Cancel before it fires:
expiryTask.kill();
```

Omitting `name` creates an independent task with a generated name. Passing a stable name replaces any pending task with that name, which provides debounce behavior:

```js
engine.taskManager.once(() => saveConfig(), 500, 'saveConfig');
```

Calling the same named task again cancels and restarts its delay. A returned handle only cancels the exact task instance it created; an old handle cannot cancel a newer task that reused the same name. Completed one-shot tasks remove themselves from the TaskManager plan before invoking the callback. The delay must be a finite number greater than zero, and the callback must be a function.

Use `addNew()` for recurring or explicitly managed task lifecycles. Call `engine.dispose()` to cancel all tasks owned by the Engine.

## State access

The StateAccess facade provides explicit reads, writes, deletes, snapshots, and serialized transactions across source, runtime, and session namespaces. Scenario source is read-only through this interface. Prefer snapshot methods for read-only consumers.

## Verification

Run `npm test`, `npm run schema:check`, `npm run audit:state:strict`, and `npm run check:server`. CI validates these checks against the headless runtime and adapter boundary.

## React application and deployment

A separate React/Vite application scaffold is available at the repository root. It intentionally renders no UI; the VSR engine remains framework-agnostic. Run `npm run dev` for local development and `npm run build` for a production build. GitHub Pages deployment is configured in `.github/workflows/deploy-react-pages.yml`; see [README-REACT.md](./README-REACT.md) for setup details.


## Timer ownership

Engine-owned one-shot work must use `engine.taskManager.once(callback, ms, name?)`. Notification expiry is scheduled through that API with a stable per-notification task name; the returned handle retains `unref()` support for Node.js process lifecycle compatibility. Expiry delays are clamped to at least one millisecond because TaskManager rejects zero or negative delays.

React-owned timers remain local to their component/provider lifecycle. `ActionCard` owns its cooldown countdown interval and refresh timeout; `ToastProvider` owns toast dismissal timers and clears its timer registry on unmount. `ActionCollection` uses an abortable UI delay for its minimum busy indicator, cancelling pending delay timers when the collection unmounts. These timers must not depend on the engine TaskManager.

Transport-owned request timeouts remain inside `WorkerJsonTransport`. They protect request/response liveness independently of gameplay pause/reset behavior. Test harness timers likewise remain test-owned; prefer fake clocks or event-based waits where practical.
