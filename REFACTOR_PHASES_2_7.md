# VSR Effect Domain Refactor (Phases 2–7) — Updated Audit

This archive is the latest refactor worktree. Domain-owned modules are the source of truth; compatibility re-export shims were removed.

## Domain ownership

- `engine/modules/Item.js`: inventory operations and item-effect execution, including add/remove/hand/usage and item stats operations.
- `engine/modules/Character.js`: character-effect execution.
- `engine/modules/Stats.js`: stat calculators, mutation helpers, clamping, notifications, and presentation updates.
- `engine/modules/Cms.js`: CMS effect execution.
- `engine/modules/Management.js`: effect keys, scope/static-list resolution, and manage-effect mutations.
- `engine/modules/SetEffects.js`: set-effect dispatch and input resolution.
- `engine/modules/Sprite.js`: Sprite runtime property mutations and presentation projection.
- `engine/modules/Effect.js`: runnable lifecycle, wrappers/templates, skip/req gates, queue integration, dispatch and error boundary; intentionally retained as one cohesive orchestrator.
- `engine/modules/effect/Strategies.js`: effect-type registry/adapters only.
- `engine/modules/Management.js`: now also owns the full `manage_effect` orchestration via `manageEffect(...)`; Effect no longer has a `handleManageEffect` compatibility method or static-list facade.
- Domain property mutation maps are owned by Automation, Scene (including Router), Action, and Character modules; the centralized `strategies/Handlers.js` file was removed.

The legacy strategy shim files (`Item.js`, `Character.js`, `Stats.js`, `Cms.js`, `Management.js`, and `SetEffects.js`) were deleted. Test import registry now points to domain modules. The Item add compatibility fallback and Set-effect dispatcher fallback were removed.

## Sprite/schema corrections

- Sprite `point` path validation accepts empty forms (`[]`, `[[]]`, `[[], <string>]`) as no-waypoint/direct-target paths. Non-empty waypoint paths still validate their transformation mode.
- Sprite motion path defaults now use the canonical `{ point: [waypoints, mode] }` structure.
- Sprite runtime no longer accepts the legacy `{ type: 'bezier', points: [...] }` scenario path shape.
- Motion event payload tests now include required runtime `start`, `end`, and `geometryMode` fields.
- Tests were updated to current schema and canonical runtime contract.

## Sprite motion concurrency hardening

- `set/sprite` now returns the `setSpriteProperty` Promise, so async motion start hooks are awaited by the effect runner.
- Per-Sprite active motion tracking implements replace/interrupt semantics. A new motion invalidates the previous one and publishes `presentation.sprite.motion.cancelled`.
- Motion publication is guarded after start hooks; superseded motion descriptors are not published. Failed start hooks remove the active motion and publish cancellation.
- Teleport position updates cancel active motions.
- Completion and impact commands reject stale motion IDs and only accept the active motion; completed duplicates remain idempotent.
- JsonClient exposes typed `sprite.motion.cancelled` events to consumers.

## Validation

- Full test suite: **325/325 pass**.
- Sprite subsystem tests: **27/27 pass**.
- Legacy compatibility shims: removed.

## Remaining boundary

The centralized property-handler module has been removed. Property mutation ownership is domain-local: Automation, Scene/Router, Action, and Character. Effect remains the orchestration boundary intentionally; it does not own domain mutation implementations. The `manage_effect` operation is now Management-owned. The type registry is not split into per-handler files because the current adapters are small and do not represent independent lifecycle/stateful subsystems.
