# VSR Client: React presentation layer

The VSR browser application uses React for the presentation layer and keeps the existing Engine boundary intact. Gameplay still runs in a dedicated Web Worker. React communicates with that Worker only through the existing `WorkerJsonTransport` and `JsonClient`, using the current JSON Protocol. The UI does not import, instantiate, or retain a reference to `GameEngine`.

## Runtime architecture

```text
Browser Main Thread
  ├── React application (src/)
  │     ├── Library / Scenario detail / Loading
  │     └── Gameplay / Dialogue / Inventory / Characters / Notifications
  ├── WorkerJsonTransport (existing adapter)
  └── JsonClient + JsonStateStore (existing JSON boundary)
          ⇅ JSON commands / snapshots / events
Dedicated Web Worker
  ├── GameEngine
  ├── JsonProtocol
  └── Domain systems / timers / save state
```

The demo scenario remains a static JSON asset under `public/scenarios`. GitHub Pages serves the UI, scenario asset, and generated Worker bundle as static files; no Node.js API server is required at runtime.

## Run locally

```sh
npm install
npm run dev
```

Build the production application with `npm run build` and inspect it with `npm run preview`.

## JSON boundary and rendering

- JSON snapshots remain the source of truth for rendered gameplay state.
- React subscribes to `JsonClient` state updates; it does not mutate Engine state locally.
- User actions are sent as allow-listed JSON commands through the existing client adapter.
- Commands retain their command IDs and expected state revision behavior.
- Transient presentation events (dialogue, notifications, timers, challenges, transitions) are consumed from the existing JSON event stream.
- The Client waits for Engine acknowledgements and resulting snapshots; it does not optimistically mutate gameplay state.
- The Engine runs off the UI thread, so gameplay computation does not block DOM interaction.

The previous browser-native renderer, stylesheet, and entry point are retained in `client/` as legacy reference files. The active entry point is `src/main.jsx`.

## Trust and security boundary

Browser-native execution means scenario data, password definitions, answers, and executable game logic must be treated as public to the player. A dedicated Worker provides execution isolation from the UI thread, not confidentiality or tamper resistance. This remains suitable for single-player scenarios whose content is intentionally shipped to the client.

Do not use this runtime for authoritative multiplayer, competitive scoring, paid unlock verification, or puzzles whose answers must remain secret. Those features require a trusted backend that validates commands and keeps protected scenario logic server-side.

## Optional Node.js API

`server/index.js` remains available as a separate server-side host for future authoritative deployments and API tests. It is not used by the React browser client or required by GitHub Pages.
