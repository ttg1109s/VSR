# VSR JSON Protocol v1 — Hybrid

The protocol is the public boundary between the headless VSR Engine and external clients. It uses snapshots for authoritative state, events for ordered changes and presentation intent, and commands for validated input.

## Envelope types

- **Snapshot** — a complete JSON-safe projection of current Engine state. Runtime-only queues, callbacks, promises, and scheduler internals are excluded.
- **Event** — ordered notification with `eventId`, `sequence`, `revision`, timestamp, event name, and JSON payload. The bounded event log supports replay by revision and reports when the requested range has expired.
- **Command** — allow-listed input with unique `commandId`, command name, JSON object payload, and optional `expectedRevision`.
- **Ack** — command result or stable error object.

## Commands

- `engine.init` — initialize from a scenario JSON object.
- `action.trigger` — execute an action by ID.
- `chat.next` and `chat.selectChoice` — advance chat or select an option.
- `inventory.toggleHand` — equip or unequip an item.
- `scene.enter` — enter a scene.
- `password.submit` — submit raw input for domain-level password verification.

Commands are registered explicitly. The protocol does not resolve arbitrary method names or accept executable values. Repeated command IDs return the original acknowledgement; `expectedRevision` supports optimistic concurrency.

## Presentation events

The Engine emits `presentation.*` events for transient client-facing effects such as notifications, transitions, chat affordances, VFX requests, and input prompts. They are not authoritative game state. A client should derive durable view state from snapshots and use presentation events for transient effects.

## Scenario compatibility

The existing scenario schema and scenario JSON remain authoritative. Protocol envelopes are separate transport objects; they do not rewrite scenario documents. Runtime scheduler objects are not serialized.

## Headless runtime

The protocol has no DOM or browser dependencies. Use `engine/index.js` as the public entry point and `npm test` to run the headless integration suite. See `DEPENDENCY_MAP.md` for the current runtime dependency graph.
