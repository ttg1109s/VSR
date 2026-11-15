# VSR Client: JSON-driven rendering

The browser Client is a standalone JavaScript presentation layer. It does not import, instantiate, or retain a reference to `GameEngine`. It communicates with the separate Node.js Engine service through JSON over HTTP and Server-Sent Events (SSE).

## Runtime architecture

```text
Browser
  ├── HttpJsonTransport
  ├── JsonClient
  ├── JsonStateStore
  └── RegionRenderer
       ├── Scene region
       ├── Router region
       ├── Actions region
       ├── Footer region
       └── Overlay region
             ⇅ JSON commands / snapshots / events
Node.js Engine Service
  ├── HTTP + SSE server
  ├── JsonProtocol
  └── GameEngine
```

Only `server/index.js` and the test-only `host/LocalEngineHost.js` import `GameEngine`. The browser build imports neither. The local Vite proxy forwards `/api` to the Engine service on port 3001.

## Run locally

Start the Engine API and Vite Client in separate terminals:

```sh
npm run server
npm run dev
```

Or use `npm run dev:full` for a combined local development process. The Engine API binds to `127.0.0.1` by default; configure `VSR_HOST` and `VSR_PORT` to change that.

## React-inspired, without React

The implementation borrows the architectural ideas, not the framework:
- A JSON snapshot is the source of truth for rendered state.
- `JsonStateStore` publishes immutable snapshot updates and detects changed top-level paths.
- The renderer is split into independently updated regions.
- Each region compares only the JSON projection it consumes and updates its own DOM subtree when that projection changes.
- Event listeners are scoped to the affected region; unrelated regions are not rebuilt.

There is no virtual DOM, JSX, hooks, React dependency, or framework reconciliation runtime. This is a small explicit state-store and region reconciliation layer in native JavaScript.

## Snapshot contract

The protocol snapshot contains:
- `game`: initialized flag and current scene/router IDs.
- `presentation`: client-safe current scene, active router, active-router actions, and scenario title.
- `state`: JSON-compatible runtime state. Password challenge internals are excluded from `state.session`.
- `session`: chat state/history, sanitized active password challenge, timer state, and notification projection.

The snapshot does not include `engine.src` or the full scenario. Action projections contain display metadata and runtime display/read flags, not executable effects, requirements, or password definitions. Password answers remain Engine-side.

## Commands

The Client sends JSON commands for:
- `action.trigger`, `action.markAsRead`
- `chat.next`, `chat.selectChoice`
- `inventory.toggleHand`, `item.use`
- `scene.enter`
- `password.submit`
- `engine.pause`, `engine.resume`
- `save.export`, `save.restore`
- `notification.read`, `notification.dismiss`

Initialization is also sent as `engine.init` with the scenario JSON. Commands carry an idempotent command ID and `expectedStateRevision`. The Client does not optimistically mutate gameplay state; it waits for the Engine acknowledgement and resulting JSON snapshot.

## Rendering lifecycle

Scene, Router, Actions, Footer, and Overlays are separate DOM regions. Scene and Router update only when their presentation projection changes. Actions update when the active router or action projection/runtime state changes. Overlays update for chat/password/notification/timer events or session projection changes. An unrelated state update does not replace the gameplay root, preserving focus and scroll in unaffected regions.

## Trust boundary

The browser sends scenario JSON to the local Engine API during demo/file initialization, but it never receives the Engine instance or scenario source back in a snapshot. The default API binds to localhost for development and does not provide production authentication. Do not expose it publicly as-is. A production deployment must add authenticated transport context, enable protocol command authorization, apply request limits/rate limits, and keep scenario/password verification on the trusted server.
