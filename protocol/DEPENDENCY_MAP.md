# VSR dependency map — headless Engine

```text
GameEngine (one instance = one isolated session)
 ├─ Engine-scoped API facade + State resolver
 ├─ JSON Protocol v2 (serialized commands, state revision, event sequence)
 ├─ Scenario validator / clone / normalization
 ├─ Domain systems: Action, Scene, Entity, Item, Chat, Automation, Effect, Logic
 ├─ TaskManager (owned scheduler, injectable clock)
 └─ SaveState v1 (scenario + domain state; runtime queues excluded)
```

Every Engine owns its API, protocol, scheduler, mutable state and effect queues. There is no process-global current Engine. Domain modules publish transient presentation events through their own API facade.

The protocol separates stateRevision from eventSequence. Commands are allow-listed and serialized. authorizeCommand is an authorization policy hook; network adapters still must authenticate callers and provide trusted context. Password definitions are resolved by the Engine from its loaded scenario.

Loader normalization clones scenario input and preserves legacy object-map actions. The built-in validator checks root/scene/router invariants, not every field of the full JSON Schema. Saves use a versioned vsr-save envelope and exclude runtime timer handles; active background work is rehydrated from saved domain state.

The test suite covers Engine isolation, password spoof rejection, protocol concurrency/revision semantics, save restore, queue cancellation and scheduler lifecycle. It does not claim exhaustive branch coverage of all scenario effects.