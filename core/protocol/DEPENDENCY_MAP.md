# VSR repository dependency map — protocol migration

This map is based on the default branch `patch` and the imports/call sites found during the protocol rollout. It distinguishes hard dependencies from temporary compatibility bridges.

## Runtime bootstrap

```text
index.html
  └─ app.js
      ├─ engine/GameEngine.js
      │   ├─ engine/modules/Config.js
      │   ├─ engine/modules/Logic.js
      │   ├─ engine/modules/Effect.js
      │   │   └─ engine/modules/effect/strategies/*
      │   ├─ engine/modules/Action.js
      │   ├─ engine/modules/Scene.js
      │   ├─ engine/modules/Entity.js
      │   ├─ engine/modules/Item.js
      │   ├─ engine/modules/Chat.js
      │   │   ├─ engine/modules/chat/BlockHandler.js
      │   │   └─ engine/modules/chat/UIHelper.js
      │   ├─ engine/modules/Automation.js
      │   ├─ engine/modules/Loader.js
      │   ├─ api/index.js
      │   └─ core/protocol/JsonProtocol.js
      ├─ render/ui.js
      │   ├─ render/modules/*
      │   ├─ components/*
      │   └─ password/index.js
      ├─ render/vfx/index.js
      ├─ plugin/taskmanager.js
      └─ api/index.js
```

## Engine-to-presentation dependencies

| Engine area | Current presentation dependency | Migration status |
|---|---|---|
| GameEngine | `API.render.notification`, `API.render.navigation` | Protocol snapshot/commands integrated; legacy bridge retained |
| Scene | `API.render.scene`, `API.render.vfx`, `API.render.components` | Emits JSON snapshot on `render()`; still invokes legacy adapter |
| Action | shake, notifications, keyboard, `this.render()` | Command entry point exists; password and feedback still use legacy adapter |
| Chat | overlay/navigation, bubbles, choices, input bar | Direct DOM access removed from Engine; UI effects still use API adapter |
| Item | notifications, item modal, inventory explorer | Legacy adapter |
| Entity / Faker | character list, player card, notifications | Legacy adapter |
| Automation | input blocking/navigation | Legacy adapter |
| Effect strategies | notifications, player card, ending, VFX | Legacy adapter |
| Loader | load error notification | Legacy adapter |

The bridge in `api/index.js` now instruments calls under `API.render` as `presentation.*` JSON events while continuing to call the existing UI methods. This is a compatibility seam, not proof that the UI has been migrated to consume protocol events.

## Presentation and reverse dependencies

- `app.js` constructs `UIController`, `GameEngine`, and VFX as browser globals; startup is not headless.
- `render/ui.js` imports render modules, components, and `password/index.js`; it directly uses `window`, `document`, timers, and resize events.
- `render/modules/common.js` composes `components/*`.
- `components/Common.js` imports `StatStyles` from `render/modules/character/utils.js`. This is a reverse dependency (component -> renderer utility) and should move to a shared presentation-token module.
- `password/Base.js` imports `PasswordRender` from `render/modules/password.js`. Password strategy logic therefore cannot yet be loaded without Render.
- `password/index.js` coordinates strategies; `render/modules/password.js` owns DOM interaction and verification paths. Puzzle/FindWay verification is still coupled to renderer strategies and must move to domain logic before Render removal.
- `render/vfx/*` is inherently DOM/media presentation code and should be replaced by a renderer adapter, not moved into the Engine.

## Global/runtime coupling

- Engine modules use `API` and the global `taskManager`; parts of the engine also read `window.taskManager`.
- Timers, asynchronous automation, character movement, effect queues, and transitions are runtime concerns. They must remain outside serialized snapshots.
- A repository search did not find `localStorage`, `sessionStorage`, `saveGame`, or `saveData` identifiers. The scenario contract is represented by `scenario.schema.json` and consumed by `engine/modules/Loader.js`. No separate persistent save-file implementation was identified in this scan, so no save format should be inferred or changed.

## Current protocol boundary

- `core/protocol/JsonProtocol.js`: DOM-free snapshot/event/command transport.
- `core/protocol/protocol.schema.json`: JSON Schema for protocol v1 envelopes.
- `api/index.js`: compatibility bridge and command facade.
- `engine/GameEngine.js`: allow-listed commands and snapshot API.
- `engine/modules/Scene.js`: publishes a snapshot after scene render-state projection.
- `engine/modules/Chat.js`: no longer reads or mutates DOM directly for choice rendering.

## Removal gates for `render/`

Do not delete Render until all of these are true:

1. No Engine or password-domain import points into `render/` or `components/`.
2. Engine modules contain no DOM/window presentation access.
3. All UI effects are represented by documented presentation events or derived from snapshots.
4. Chat, password, action, scene, inventory, entity, automation, effects, notifications, and VFX each have an alternative renderer adapter.
5. Password validation is deterministic and lives in domain logic; UI only submits JSON input.
6. A headless test suite covers command validation, state transitions, legacy scenario loading, event ordering/replay, and save compatibility.
7. Browser integration tests verify the existing renderer still behaves correctly during migration.
8. A second renderer can run against snapshots/events/commands without importing `render/`.

The present implementation completes the protocol foundation and several first decoupling slices (Chat DOM removal, password adapter inversion, shared password verification, shared stat tokens). It does **not** satisfy the Render-removal gates.
