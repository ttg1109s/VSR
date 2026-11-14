# VSR Engine

VSR is now distributed as a headless game engine. The legacy browser UI, DOM renderer, visual-effects layer, and UI component templates have been removed. A separate client can consume the engine through its versioned JSON protocol.

## Requirements

- Node.js 20 or newer
- No runtime UI framework or browser DOM is required

## Install and test

```bash
npm test
```

The test suite imports the Engine in a Node process without defining `window` or `document`, loads the complete demo scenario, enters scenes, dispatches commands, and checks JSON presentation events.

## Basic usage

```js
import { GameEngine, DEMO_SCRIPT } from './engine/index.js';

const engine = new GameEngine();
await engine.init(structuredClone(DEMO_SCRIPT));

const snapshot = engine.protocol.createSnapshot(engine);
console.log(snapshot);

const unsubscribe = engine.protocol.subscribe(event => {
  // Send this JSON event to a renderer, client, or transport.
  console.log(event);
});

const command = engine.protocol.createCommand('scene.enter', {
  sceneId: 'scene_gallery',
  skipTransition: true
});

const acknowledgement = await engine.dispatchProtocolCommand(command);
console.log(acknowledgement);

// Dispose runtime timers when the engine instance is no longer used.
unsubscribe();
engine.taskManager.killAll();
```

## Hybrid JSON protocol v1

The protocol consists of four envelope types:

- **Snapshot** — JSON-safe projection of Engine domain state. Runtime callbacks, promises, scheduler objects, and circular references are excluded.
- **Event** — ordered domain and presentation notifications with event ID, sequence, timestamp, and revision.
- **Command** — allow-listed input with an idempotent command ID and optional expected revision.
- **Ack** — command result or structured error.

See `core/protocol/README.md` and `core/protocol/protocol.schema.json`.

## Presentation boundary

Engine modules do not import a renderer or access DOM APIs. Calls such as notification, chat updates, transitions, VFX requests, and input requests are emitted as `presentation.*` JSON events. The Engine does not attempt to draw them. A consumer may ignore, log, persist, or render these events using any client technology.

## Scenario compatibility

`scenario.schema.json` remains the source contract for scenario JSON. Existing scenario structure is loaded by `LoaderSystem`; protocol envelopes are separate transport objects and do not rewrite the scenario schema.

## Runtime ownership

Each `GameEngine` instance owns its own `TaskManager`. Create one Engine per game session. Call `engine.taskManager.killAll()` when disposing the instance to stop background automation, character movement, and timers.

## Dependency map

See `core/protocol/DEPENDENCY_MAP.md` for the Engine module map and remaining domain boundaries.
