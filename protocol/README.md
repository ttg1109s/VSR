# VSR Hybrid JSON Protocol v2

Each `GameEngine` instance owns its API facade, state resolver, protocol, and task manager. There is no process-global current Engine.

## State and event cursors

- `stateRevision` is the authoritative state revision. The legacy `revision` field is retained as an alias where applicable.
- `eventSequence` advances for every published event, including transient presentation and command-lifecycle events.
- Use `expectedStateRevision` for optimistic concurrency. `expectedRevision` is accepted as a compatibility alias.
- Use `getEventsAfter(sequence)` to resume an event stream. If the bounded event buffer reports a gap, request a fresh snapshot.
- Presentation events describe transient intent; clients should derive durable state from snapshots and domain state rather than treating presentation events as authoritative state.

## Commands and trust boundary

Commands are allow-listed and serialized per Engine. Command idempotency is keyed by `commandId`, bounded in memory, and is not durable across process restarts.

An optional `authorizeCommand` hook can enforce an authorization policy using trusted transport context. It is not an authentication mechanism. A network adapter remains responsible for authenticating callers and constructing trustworthy context.

### Password submission

The `password.submit` command requires an active Engine-owned challenge. Its payload must include:

- `challengeId` — the ID issued for the currently active challenge.
- `input` — the raw value submitted by the client; required unless cancelling.
- `cancel: true` — cancels the active challenge without consuming an attempt.

The Engine rejects missing, stale, or mismatched challenge IDs and validates that the challenge still belongs to the active scene and router. The Engine resolves the password definition and effects from the loaded scenario. The client must not submit a success flag, retry counter, password configuration, answer, or other authority-bearing data.

A wrong answer either leaves the challenge active for another attempt or exhausts it according to the Engine-side retry policy. The Engine enforces the challenge deadline. Clients should treat the command acknowledgement and subsequent protocol events as the result; they must not determine success locally.

## Scenario and saves

Scenario JSON is separate from save data. `formatVersion` is optional and defaults to 1, independently of `meta.version`. Loader normalization clones scenario input and preserves legacy object-map router actions.

The built-in validator checks core root, scene, and router invariants; it is not a full JSON Schema validator.

Save data uses a separate `vsr-save` version-2 envelope (with normalization support for version 1). Runtime queues and timer handles are excluded. Active domain work is rehydrated from saved domain state where supported. See `../engine/persistence/save.schema.json`.
