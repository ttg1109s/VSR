# VSR Hybrid JSON Protocol v2

Each Engine owns its own API facade, state resolver, protocol and task manager. No process-global current Engine is used.

## State and event cursors
- `stateRevision` (legacy alias `revision`) advances only when an authoritative snapshot is committed.
- `eventSequence` advances for every event, including transient presentation and command lifecycle events.
- Use `expectedStateRevision` for optimistic concurrency; `expectedRevision` remains a compatibility alias.
- Use `getEventsAfter(sequence)` for event-stream resume. If the bounded event buffer reports a gap, request a fresh snapshot.

Presentation events are transient intent, not authoritative state. Durable client state must be derived from snapshots/domain state.

## Commands and trust boundary
Commands are allow-listed and serialized per Engine. `commandId` idempotency is bounded and in-memory, not durable across process restarts. An optional `authorizeCommand` hook can enforce policy using trusted transport context; it is not an authentication system.

`password.submit` accepts `actionId`, optional `uniqueId`, raw `input`, or `cancel: true`. The Engine resolves password configuration and effects from its loaded scenario. Client-supplied action definitions and password configurations are not accepted.

## Scenario and saves
Scenario JSON is separate from save data. `formatVersion` is optional and defaults to 1, independent of `meta.version`. Loader normalization clones its input and preserves legacy object-map router actions. The built-in validator checks root/scene/router invariants; it is not a full JSON Schema validator.

Save data uses a separate `vsr-save` version-1 envelope. Runtime queues and timer handles are excluded; movement and active automation tasks are rehydrated from domain state. See `../engine/persistence/save.schema.json`.
