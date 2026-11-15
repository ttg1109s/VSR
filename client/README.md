# VSR Client: JSON-driven rendering

The browser client is a framework-free JavaScript presentation layer. It does not import, instantiate, or retain a reference to `GameEngine`. The only browser-side Engine integration is isolated in `host/LocalEngineHost.js`, which acts as a local transport host for development. A remote HTTP/WebSocket host can replace it without changing the Client.

## Runtime boundary

```text
Engine Host (local development or remote server)
  ├── GameEngine
  └── JsonProtocol
       ⇅ JSON command / snapshot / event
Client
  ├── JsonClient
  ├── JsonStateStore
  └── RegionRenderer
       ├── Scene region
       ├── Router region
       ├── Actions region
       ├── Footer region
       └── Overlay region
```

Only the host imports `GameEngine`. The Client sends serialized command envelopes and consumes serialized snapshots/events. No adapter exposes `engine`, `src`, engine methods, or mutable engine state.

## React-inspired, without React

The implementation borrows the useful architectural ideas rather than the framework:
- A single immutable JSON snapshot is the source of truth for rendered state.
- `JsonStateStore` publishes updates and computes changed top-level paths.
- The renderer is split into independently updated regions.
- Each region compares only the JSON projection it consumes and updates its own DOM subtree when that projection changes.
- Event listeners are attached to the affected region; unrelated regions are not rebuilt.

There is no virtual DOM, JSX, hooks, reconciliation framework, or React dependency. This is a small explicit state-store and region-reconciliation layer written in native JavaScript.

## Snapshot contract

The protocol snapshot contains:
- `game`: initialized flag and current scene/router IDs.
- `presentation`: client-safe current scene, active router, active-router actions, and scenario title.
- `state`: JSON-compatible runtime state. Password challenge internals are excluded from `state.session`.
- `session`: chat/session projection, a sanitized active password challenge, and notification projection.

The snapshot does not include `engine.src` or the full scenario. Action projections contain display metadata and runtime display/read flags, not executable effects, requirements, or password definitions. Password answers remain Engine-side.

## Commands

The Client currently sends JSON commands for:
- `engine.init` (host initialization)
- `action.trigger`, `action.markAsRead`
- `chat.next`, `chat.selectChoice`
- `inventory.toggleHand`, `item.use`
- `scene.enter`
- `password.submit`
- `engine.pause`, `engine.resume`
- `save.export`, `save.restore`
- `notification.read`, `notification.dismiss`

Commands are serialized by the protocol, carry an idempotent command ID, and use `expectedStateRevision`. The Client does not optimistically mutate gameplay state; it waits for the Engine acknowledgement and the resulting JSON snapshot.

## Rendering lifecycle

Scene, Router, Actions, Footer, and Overlays are separate DOM regions. Scene and Router only update when their own presentation projection changes. Actions update when the active router or action projection/runtime state changes. Overlays update for chat/password/notification/timer events or session projection changes. An unrelated state update does not replace the entire gameplay root, so scroll position and focus in unaffected regions remain intact.

## Deployment boundary

`LocalEngineHost` still runs the Engine in the same browser process and is intended for local prototyping. It is a transport boundary, not a security boundary. For production or multiplayer, run the Engine on a trusted server, authenticate transport requests, enable protocol authorization, and send only client-safe snapshots/events. The Client transport contract remains JSON-only in either deployment.
