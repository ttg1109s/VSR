# VSR Engine

VSR is a headless game engine. The legacy browser UI, DOM renderer, visual-effects layer, and UI component templates are not part of this package. A separate client can consume the Engine through its versioned JSON protocol.

## Requirements

- Node.js 20 or newer.
- No runtime UI framework or browser DOM is required.

## Package entry points

The package is private and exposes these entry points:

- `vsr-engine` — Engine exports from `engine/index.js`.
- `vsr-engine/protocol` — JSON protocol implementation.
- `vsr-engine/scenario-schema` — scenario JSON schema.
- `vsr-engine/scenario` — scenario loader and model utilities.
- `vsr-engine/save-schema` — save-envelope JSON schema.
- `vsr-engine/state` — StateAccess implementation.
- `vsr-engine/utils` — reusable utility facade.

## Basic usage

```js
import { GameEngine, DEMO_SCRIPT } from './engine/index.js';

const engine = new GameEngine();
await engine.init(structuredClone(DEMO_SCRIPT));

const snapshot = engine.protocol.createSnapshot(engine);
console.log(snapshot);

const unsubscribe = engine.protocol.subscribe(event => {
  // Forward JSON events to a renderer, client, or transport.
  console.log(event);
});

const command = engine.protocol.createCommand('scene.enter', {
  sceneId: 'scene_gallery',
  skipTransition: true
});

const acknowledgement = await engine.dispatchProtocolCommand(command);
console.log(acknowledgement);

// Dispose runtime timers when the Engine instance is no longer used.
unsubscribe();
engine.taskManager.killAll();
```

## Hybrid JSON protocol v2

The protocol uses four envelope types:

- **Snapshot** — a JSON-safe projection of Engine state. Runtime callbacks, promises, scheduler objects, and circular references are excluded.
- **Event** — an ordered domain or presentation notification with an event ID, sequence, timestamp, and state revision.
- **Command** — allow-listed input with an idempotency key and an optional expected state revision.
- **Ack** — the command result or a structured error.

See `protocol/README.md` and `protocol/protocol.schema.json` for the transport contract.

## Presentation boundary

Engine modules do not render UI or access browser DOM APIs. Notifications, chat updates, transitions, visual-effect requests, and input requests are emitted as presentation events. A client may ignore, log, persist, or render those events using its own technology.

## Scenario and save compatibility

`scenario.schema.json` defines the scenario authoring contract. Scenario data and save data are separate formats. Save data uses the versioned `vsr-save` envelope described by `engine/persistence/save.schema.json`; it does not replace or rewrite the scenario format.

The built-in scenario validator checks core root, scene, and router invariants. It is not a complete JSON Schema validator.

## Runtime ownership

Each `GameEngine` instance owns its API facade, protocol, mutable state, password challenge state, and `TaskManager`. Create one Engine per game session. Call `engine.taskManager.killAll()` when disposing the instance to stop scheduled background work and timers.

## State access

The StateAccess facade provides explicit reads, writes, deletes, snapshots, and serialized transactions across source, runtime, and session namespaces. Scenario source is read-only through this interface. Legacy getters retain reference semantics; prefer snapshot methods for read-only consumers.

## Shared utilities

Reusable helpers live in `utils/` and are available through `createUtils()` or the `vsr-engine/utils` package subpath. The utility facade exposes `check`, `random`, `number`, and `array`. It does not access Engine state or register runtime plugins. Each Engine API facade exposes the same capability as `engine.api.utils`.

## Verification status

There is currently no `test` script in `package.json`, and the repository contains no checked-in automated test suite. Do not use `npm test` as a verification command unless a test script and tests are added again. Runtime behavior and integrations must be verified with an appropriate external test harness before release.
