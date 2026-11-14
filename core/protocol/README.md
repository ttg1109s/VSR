# VSR JSON Protocol (Hybrid)

The protocol is an additive boundary between the game engine and any presentation client. It does not replace or rewrite the scenario schema, legacy save layout, or in-memory domain state.

## Envelope types

- **Snapshot**: a complete JSON-safe projection of the current domain state. Runtime-only queues, task callbacks, promises, and scheduler internals are excluded.
- **Event**: an ordered notification with `eventId`, `sequence`, and monotonically increasing `revision`. A `state.snapshot` event carries a recovery snapshot.
- **Command**: a validated request to the engine. Commands are allow-listed, carry a unique `commandId`, and may include `expectedRevision` for optimistic concurrency.
- **Ack**: command result or a stable error code.

## Compatibility

Scenario JSON and the existing Engine state shape remain authoritative. Protocol envelopes are separate objects and are never written into legacy scenario or save objects. The snapshot's `state` is a JSON-safe projection of existing state keys, with only runtime-only fields omitted. No migration of old scenario files is required.

## Initial command set

- `engine.init` — initialize from a scenario JSON object.
- `action.trigger` — execute an action by ID.
- `chat.next` and `chat.selectChoice` — advance chat or choose an option.
- `inventory.toggleHand` — equip/unequip an item.
- `scene.enter` — enter a scene.

The protocol intentionally does not accept arbitrary method names or executable values.

## Current migration boundary

The protocol core is DOM-free and can be instantiated in headless tests. Existing UI calls through `API.render` remain as a compatibility adapter during migration. Removing `render/` is blocked until those calls, DOM access in Engine modules, password verification, app bootstrap, and browser integration tests have been migrated.
