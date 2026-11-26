# Independent audit and domain-boundary refactor report

## Source and baseline

This pass used only `vsr-refactor-audited.zip` as the starting source. The archive's baseline was independently rerun before edits: `npm test` passed **320/320** (0 failures). No original archive was used as a code base.

## Domain ownership cleanup completed

The remaining property-mutation handler maps were moved out of `engine/modules/effect/strategies/Handlers.js` and into domain-owned modules:

- Automation handlers -> `engine/modules/Automation.js`
- Scene and Router handlers -> `engine/modules/Scene.js` (Router mutations are Scene-scoped because router runtime keys and activation are resolved through Scene context)
- Action handlers -> `engine/modules/Action.js`
- Character handlers -> `engine/modules/Character.js`

`Handlers.js` was deleted. `Strategies.js` and `SetEffects.js` now import the handlers from their owning domain modules. Dispatcher/wrapper behavior remains in the effect strategy layer. No legacy handler module, re-export shim, or fallback import was retained.

## Validation after changes

- `npm test`: **320/320 pass**, 0 failures.
- JavaScript syntax checks for all `engine` and `tests` JavaScript files: pass.
- Compatibility scan: no references to the deleted `strategies/Handlers.js` remain.
- ZIP integrity: checked after packaging.

## Effect / Management ownership decision and implementation

The `Effect` domain remains the central effect-execution orchestrator. `processRunnables`, `processRunnable`, `applyEffect`, queue integration, wrapper/template handling, skip/req gates, dispatch, and error wrapping remain in `engine/modules/Effect.js`; they form one coherent execution lifecycle and were not fragmented into small files.

The `manage_effect` orchestration was moved to the Management domain as exported `manageEffect(engine, cfg, context, currentKey, sourceList)`. It now owns target scope resolution, canonical key generation, subtype validation/dispatch, and static-list selection. `Effect.js` no longer contains `handleManageEffect` or its static-list facade. The effect type adapter in `effect/Strategies.js` resolves the dynamic target and delegates directly to `manageEffect`.

The small effect-type adapters remain in `Strategies.js`; they are a registry and routing layer, not domain mutation ownership. `goto` navigation logic remains in its navigation strategies, and `vfx` remains in the registry for now because its current lookup/dispatch flow does not justify a separate subsystem.

Property mutation behavior is domain-owned for Automation, Scene/Router, Action, and Character. Scene owns Router-specific mutation handlers because Router activation, blocked state, and runtime keying are tied to Scene navigation context. No backward-compatibility method or shim for `handleManageEffect` was retained.

## Notes

The test suite contains deliberate legacy/corrupt-save defensive tests and ordinary algorithmic fallbacks. Those are not backward-compatibility API shims and were not removed merely because they contain the words `legacy` or `fallback`.


## Sprite Motion/Physics v2 full architecture refactor

The later Sprite Motion/Physics v2 pass removes the v1 motion descriptor, Client impact report, and completion commands. Engine now generates trajectory, CCD collision events, impulse resolution, post-impact segments, affected-body final positions, and ACK-gated runtime commit. Active trajectory state is saved in save version 4 and republished after restore. Full test suite: 318/318; stress suite: 67/67. Detailed implementation limits and protocol are documented in `SPRITE_MOTION_PHYSICS_V2_IMPLEMENTATION.md`.


## Sprite Motion/Physics v2 audit hardening pass

The audit findings F-01 through F-09 were addressed in the working source: restitution pair-order dependence, exact-center overlap, atomic multi-body ACK commit, retryable/persisted end-hook failure, active-target trajectory rebasing, explicit collision event-limit rejection, simulation option validation, waypoint traversal, and implementation-report synchronization. Save format is now v5 because pending end-hook recovery state is persisted.

Validation: full suite **329/329 pass**; stress suite **75/75 pass**; syntax checks and schema validation are included in the release audit.
