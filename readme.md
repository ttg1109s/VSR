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

## Production deployment and command authorization

For a network-facing deployment, keep the authoritative Engine on a trusted server. Do not send scenario source or password answer values to an untrusted client. Authenticate callers in the transport adapter and enable required command authorization:

```js
const engine = new GameEngine({
  requireAuthorization: true,
  authorizeCommand: async ({ command, payload, context }) => {
    // context.principal must be populated by trusted server middleware.
    const principalId = context?.principal?.id;
    if (!principalId) return false;

    // Apply your application's session, ownership and command policy here.
    return await authorizeGameCommand({ principalId, command, payload });
  }
});
```

The adapter must set `context.principal.id` from the authenticated session, not from client-supplied payload data. Authorization is not authentication; the Engine cannot secure a deployment whose transport trusts client-provided identity. Local/in-process use may retain the default optional authorization mode.

Password verification supports number, string, switch, validated grid paths, and jigsaw piece arrangements. For jigsaw challenges, clients submit the final row-major piece order as `input`; the Engine validates the full arrangement and the configured piece count.

## Hybrid JSON protocol v2

The protocol uses four envelope types:

- **Snapshot** — a JSON-safe projection of Engine state. Runtime callbacks, promises, scheduler objects, and circular references are excluded.
- **Event** — an ordered domain or presentation notification with an event ID, sequence, timestamp, and state revision.
- **Command** — allow-listed input with an idempotency key and an optional expected state revision.
- **Ack** — the command result or a structured error.

See `protocol/README.md` and `protocol/protocol.schema.json` for the transport contract.

## Notifications API

Notifications are exposed only through `engine.api.notifications`. Engine modules and scenario effect strategies must use this API; the generic presentation command proxy does not expose a notification facade.

```js
engine.api.notifications.add('Thông báo', 'Nội dung', 'success', {
  source: 'engine',
  category: 'engine.example'
});

engine.api.notifications.alert('Cảnh báo', 'Nội dung', 'warning');
engine.api.notifications.markRead(notificationId);
engine.api.notifications.dismiss(notificationId);
engine.api.notifications.getHistory();
engine.api.notifications.getPending();
```

Notification events use the canonical `presentation.notification.*` event namespace and carry a single `notification` object in the payload. The former positional `args` payload is not emitted.

## Presentation boundary

Engine modules do not render UI or access browser DOM APIs. Notifications, chat updates, transitions, visual-effect requests, and input requests are emitted as presentation events. A client may ignore, log, persist, or render those events using its own technology.

## Scenario and save compatibility

`scenario.schema.json` defines the scenario authoring contract. Scenario data and save data are separate formats. Save data uses the versioned `vsr-save` envelope described by `engine/persistence/save.schema.json`; it does not replace or rewrite the scenario format.

The built-in scenario validator checks core root, scene, and router invariants. It is not a complete JSON Schema validator.

## Runtime ownership

Each `GameEngine` instance owns its API facade, protocol, gameplay state, session state, Engine-internal orchestration state, and `TaskManager`. Effect queues and queue-running flags live under `engine.runtime`, separate from serializable gameplay state. Create one Engine per game session. Call `engine.dispose()` when disposing the instance to stop scheduled background work and timers.

## State access

The StateAccess facade provides explicit reads, writes, deletes, snapshots, and serialized transactions across source, runtime, and session namespaces. Scenario source is read-only through this interface. Legacy getters retain reference semantics; prefer snapshot methods for read-only consumers.

## Shared utilities

Reusable helpers live in `utils/` and are available through `createUtils()` or the `vsr-engine/utils` package subpath. The utility facade exposes `check`, `random`, `number`, and `array`. It does not access Engine state or register runtime plugins. Each Engine API facade exposes the same capability as `engine.api.utils`.

## Verification status

Run `npm test` for the checked-in Node.js regression tests, `npm run audit:state` for the AST candidate report, and `npm run audit:state:strict` to enforce the reviewed allowlist. The Acorn-based audit is syntax- and member-expression-aware, but it is not a complete interprocedural data-flow proof. CI runs tests and strict audit on pushes to this branch and pull requests. Runtime behavior and integrations still require validation in the target host/client environment.
