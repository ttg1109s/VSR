# Home Actions — Runtime Execution Contract

Status: implemented in the React presentation layer; Engine remains authoritative.
Branch: engine-only.

## 1. Run Demo Script

1. The Home page imports the bundled `DEMO_SCRIPT` from the repository root `demo_script.js`.
2. The application creates `WorkerJsonTransport` and `JsonClient`; React does not import or instantiate `GameEngine`.
3. The application calls `client.initialize(DEMO_SCRIPT)`, which dispatches the existing `engine.init` protocol command with payload `{ script }`.
4. The UI enters the runtime view only after the acknowledgement has been received and JsonClient exposes an initialized snapshot.
5. The runtime view renders only the client-safe `snapshot.presentation` projection.
6. Selecting an action dispatches the existing `action.trigger` command with `{ actionId, uniqueId }`. The unique ID follows the Engine's composite key: `sceneId_routerId_actionId`.
7. The UI updates from `state.snapshot` events. It does not mutate gameplay state locally.

## 2. Import JSON

1. The Home page accepts a local `.json` file and reads it as text.
2. The client rejects files larger than 5 MiB and rejects non-JSON file selections.
3. Browser JSON parsing checks syntax and requires a top-level object. This is not scenario validation.
4. The parsed object is passed to the same `client.initialize(scenario)` flow as the demo.
5. Engine initialization and its acknowledgement remain authoritative for scenario validation. Syntax, Engine validation, and transport errors are surfaced to the user separately through the visible error state.
6. The original file is not uploaded to a server or persisted by this flow.

## 3. Shared lifecycle and failure handling

- Each run owns one Worker transport and one JsonClient.
- The app subscribes before initialization so the first snapshot event is not missed.
- A runtime view is shown only after successful initialization.
- Initialization failure disposes the client and closes the Worker; the user remains on Home and sees the error.
- Exiting the runtime disposes the client and closes the Worker.
- Action requests are serialized at the UI by disabling action controls while one is pending; Engine protocol acknowledgements determine success.
- The browser Worker is an execution boundary, not a confidentiality boundary. Scenario source and client-side secrets are not protected from the player.
- No account, cloud persistence, multiplayer, or server-authoritative trust model is implied.

## 4. Protocol commands used

| UI operation | Existing protocol command | Payload |
|---|---|---|
| Run Demo Script | `engine.init` | `{ script: DEMO_SCRIPT }` |
| Import JSON | `engine.init` | `{ script: parsedScenario }` |
| Select runtime action | `action.trigger` | `{ actionId, uniqueId }` |

No new protocol command is introduced. This implementation consumes the existing JSON Protocol v2 allow-list through the public JsonClient API.
