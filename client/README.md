# VSR Client: Browser-native JSON runtime

The VSR browser application runs the gameplay Engine in a dedicated Web Worker. The UI thread communicates with that Worker exclusively through the existing JSON Protocol; it does not import, instantiate, or retain a reference to `GameEngine`.

## Runtime architecture

```text
Browser Main Thread
  ├── Homescreen / Scenario Info / Loading
  ├── WorkerJsonTransport
  ├── JsonClient
  ├── JsonStateStore
  └── RegionRenderer
          ⇅ JSON commands / snapshots / events
Dedicated Web Worker
  ├── GameEngine
  ├── JsonProtocol
  └── Domain systems / timers / save state
```

The demo scenario is a static JSON asset under `public/scenarios`. GitHub Pages serves the UI, scenario asset, and generated Worker bundle as static files; no Node.js API server is required at runtime.

## Run locally

```sh
npm install
npm run dev
```

The Node.js requirement applies to the development toolchain, schema generation, and test runner. It is not a runtime server requirement for the deployed game.

## JSON boundary and rendering

- A JSON snapshot is the source of truth for rendered state.
- `JsonStateStore` publishes immutable snapshot updates and detects changed top-level paths.
- Scene, Router, Actions, Footer, and Overlay are independently updated DOM regions.
- Commands carry an idempotent command ID and expected state revision.
- The Client waits for Engine acknowledgements and resulting JSON snapshots; it does not optimistically mutate gameplay state.
- The Engine runs off the UI thread, so synchronous gameplay computation does not block DOM interaction.

There is no React dependency, virtual DOM, JSX, or framework reconciliation runtime.

## Trust and security boundary

Browser-native execution means scenario data, password definitions, answers, and executable game logic must be treated as public to the player. A dedicated Worker provides execution isolation from the UI thread, not confidentiality or tamper resistance. It is suitable for single-player scenarios whose content is intentionally shipped to the client.

Do not use this runtime for authoritative multiplayer, competitive scoring, paid unlock verification, or puzzles whose answers must remain secret. Those features require a trusted backend that validates commands and keeps protected scenario logic server-side.

## Optional Node.js API

`server/index.js` remains available as a separate server-side host for future authoritative deployments and API tests. It is not used by the Browser-native client or required by GitHub Pages.
