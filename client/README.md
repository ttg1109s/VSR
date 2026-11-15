# VSR Client Adapters

This directory contains framework-agnostic protocol and transport adapters only. No application UI, DOM renderer, debug drawer, or presentation styles are included.

## Runtime boundary

```text
Host application (any presentation technology)
  └── JsonClient
        └── WorkerJsonTransport
              ⇅ JSON commands / acknowledgements / snapshots / events
            Dedicated Web Worker
              ├── GameEngine
              └── JsonProtocol
```

The adapters are presentation-agnostic. They do not create DOM elements, import application components, or own design/layout behavior.

## Usage

```js
import { JsonClient } from './adapters/JsonClient.js';
import { WorkerJsonTransport } from './adapters/WorkerJsonTransport.js';

const transport = new WorkerJsonTransport();
const client = new JsonClient(transport);
const inspection = await client.inspectScenario(scenario);
// Show inspection.result.metadata to the user and wait for confirmation.
const initialSnapshot = await client.initialize(scenario);

const unsubscribe = client.subscribe(message => {
  if (message.type === 'state') {
    // Consume the JSON snapshot in the host's own state layer.
  }
});

await client.triggerAction('action-id', 'unique-action-id');

// Teardown
unsubscribe();
client.dispose();
transport.close();
```

`client.inspectScenario(scenario)` sends the `scenario.inspect` command and returns its acknowledgement. Inspection validates the scenario and returns safe metadata without initializing gameplay. Call `initialize` only after the user confirms.

The Engine remains inside a dedicated module Worker. The main thread communicates through the versioned JSON protocol and does not import or instantiate `GameEngine`.

## Security

A browser Worker is an execution boundary, not a confidentiality boundary. Scenario contents and client-side password definitions are visible to the player. Protected game state and authoritative decisions require a trusted server.
