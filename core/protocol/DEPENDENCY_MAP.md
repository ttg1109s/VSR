# VSR dependency map — headless Engine

## Runtime dependency graph

```text
engine/index.js
  └─ engine/GameEngine.js
      ├─ engine/modules/Config.js
      ├─ engine/modules/Logic.js
      │   └─ engine/modules/Resolver.js
      ├─ engine/modules/Effect.js
      │   └─ engine/modules/effect/*
      ├─ engine/modules/Action.js
      ├─ engine/modules/Scene.js
      ├─ engine/modules/Entity.js
      │   └─ engine/modules/entity/*
      ├─ engine/modules/Item.js
      ├─ engine/modules/Chat.js
      │   ├─ engine/modules/chat/BlockHandler.js
      │   └─ engine/modules/chat/Presentation.js
      ├─ engine/modules/Automation.js
      ├─ engine/modules/Loader.js
      ├─ api/index.js
      │   ├─ api/state.js
      │   └─ plugin/basefunction.js
      ├─ plugin/taskmanager.js
      ├─ password/verify.js
      └─ core/protocol/JsonProtocol.js
```

## Runtime boundaries

| Layer | Responsibility | Browser dependency |
|---|---|---|
| GameEngine and modules | Scenario loading, state transitions, actions, chat, inventory, entities, automation, effects | None |
| TaskManager | Timers, automation scheduling, NPC movement | None; uses standard JS timers |
| API state access | Schema-key lookup bound to a GameEngine instance | None |
| JSON Protocol | Snapshot, event log/replay, command validation and acknowledgements | None |
| Presentation port | Converts UI intent into `presentation.*` JSON events | None |
| Password verifier | Pure domain validation for string, puzzle, and find-way inputs | None |

## Presentation event flow

Engine modules call `API.presentation.<area>.<operation>(...args)`. The API serializes the arguments and publishes a JSON event through the Engine protocol. It never imports, invokes, or inspects a renderer. A consumer may subscribe to the event stream or derive a view from snapshots.

Presentation events are effects/intent, not domain state. A renderer should treat snapshots as authoritative and use presentation events for transient requests such as notifications, transitions, chat input affordances, and VFX.

## Runtime ownership

Every GameEngine instance owns a TaskManager. The scheduler is not stored inside the JSON snapshot. Dispose an engine by calling `engine.taskManager.killAll()`.

The API state resolver is explicitly bound by `API.bindEngine(engine)` when an Engine instance is constructed. It does not read a global `window.engine`.

## Removed legacy surface

The browser app bootstrap, DOM UI, VFX implementation, UI component templates, stylesheet assets, browser-only diagnostic pages, and old password UI strategy classes have been removed. The pure password verifier remains in `password/verify.js`.

## Verification

The `Engine headless tests` workflow runs `npm test` on every push to `patch`. It imports the Engine without `window` or `document`, initializes the complete demo scenario, tests scene commands, verifies presentation events, and rejects unknown commands.

The Engine has been runtime-tested headlessly for these paths. This does not claim exhaustive coverage of every action/effect branch; extend `tests/engine.headless.test.js` whenever a new domain path is migrated or modified.
