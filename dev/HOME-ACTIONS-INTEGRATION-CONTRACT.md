# Home Actions — Runtime Loading Contract

Status: implemented in the React presentation layer; Engine remains authoritative.
Branch: engine-only.

## 1. Inspect Demo Script

1. The Home page imports the bundled `DEMO_SCRIPT` from the repository root `demo_script.js`.
2. The application creates a short-lived `WorkerJsonTransport` and `JsonClient`; React does not import or instantiate `GameEngine`.
3. The application calls `client.inspectScenario(DEMO_SCRIPT)`, which dispatches `scenario.inspect`.
4. The returned safe metadata is shown by `ScenarioPreviewPage`. Inspect does not initialize runtime state or enter a scene.

## 2. Import JSON

1. The Home page accepts a local `.json` file and reads it as text.
2. The client rejects files larger than 5 MiB and rejects non-JSON file selections.
3. Browser JSON parsing checks syntax and requires a top-level object. This is not scenario validation.
4. The parsed object is passed to `scenario.inspect`; Engine validation and transport errors are surfaced through the visible error state.
5. The original file is not uploaded to a server or persisted by this flow.

## 3. Load lifecycle

1. The user presses Play on the scenario metadata page.
2. The application creates one dedicated Worker transport and one `JsonClient` for this load session.
3. `client.initialize(scenario, { enterScene: false })` dispatches `engine.init` with `{ script, enterScene: false }`.
4. Engine loads and normalizes the scenario, initializes runtime data, validates that the configured entry scene exists, and publishes an initialized snapshot. It does not call `enterScene` and does not populate player movement history.
5. The application remains on a full-page Loading page. The progress indicator is indeterminate while the Worker request is pending; it becomes complete only after the acknowledgement and initialized snapshot are received. No estimated percentage is shown.
6. The loaded Worker and client remain alive on the completed Loading page. Scene entry and Gameplay are deliberately out of scope for this phase.

## 4. Cancellation and failure

- The Loading page is a page-level view, not a modal or dialog.
- The X control invalidates the current load generation, disposes the client, terminates the Worker (cancelling in-flight engine work), and returns to the same scenario metadata page.
- A Worker request has a 30-second timeout. Timeout or Worker failure closes the runtime and displays an error state on the Loading page.
- Retry creates a new Worker and a new client; it never reuses a partially initialized runtime.
- Closing the completed Loading page also disposes the loaded runtime and returns to scenario metadata.
- Exiting the metadata page returns Home. Runtime resources are cleaned up if present.

## 5. Protocol commands used

| UI operation | Existing protocol command | Payload |
|---|---|---|
| Inspect Demo Script | `scenario.inspect` | `{ scenario: DEMO_SCRIPT }` |
| Inspect imported JSON | `scenario.inspect` | `{ scenario: parsedScenario }` |
| Load scenario | `engine.init` | `{ script: scenario, enterScene: false }` |

No new protocol command is introduced. The optional `enterScene` field preserves the existing default behavior for direct Engine consumers while allowing the React loading flow to stop after scenario load.
