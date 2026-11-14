# State Access Audit

- Repository: `ttg1109s/VSR`
- Branch: `patch`
- Audited source commit: `509d7df673903d26bb566567adaa2c77cf2f27dc`
- Method: repository-wide JavaScript scan using targeted regular expressions for raw `this.state.*` and `engine.state.*` property access, followed by manual context classification.
- Scope: 44 tracked JavaScript files in the audited Git tree. Regex findings are indicators, not proof of a defect.
- Reusable scanner: `tools/audit-state-access.js`
- Run from the repository root: `node tools/audit-state-access.js`; add `--json` for machine-readable output.

## Findings requiring review

### A. Runtime/gameplay state accessed outside StateAccess

| File | Lines | Direct access | Classification |
|---|---:|---|---|
| `engine/GameEngine.js` | 40 | `this.state.sceneId`, `this.state.scenes` | Read runtime state directly while validating a password challenge |
| `engine/GameEngine.js` | 72-73 | `this.state.scenes` | Read runtime scene map directly during initialization |
| `engine/GameEngine.js` | 75 | `this.state.playerMoveHistory.push(entry)` | Mutate runtime array directly |
| `engine/GameEngine.js` | 115 | `this.state.characters` | Read runtime character map directly |
| `engine/GameEngine.js` | 121 | `this.state.automations` | Read runtime automation map directly |
| `engine/GameEngine.js` | 173-178 | `this.state.automations`, `this.state.characters` | Read runtime maps directly to pause/resume background tasks |
| `engine/modules/Effect.js` | 23-24 | `this.state.effect_overrides` | Read runtime override list directly; list reference is reused |
| `engine/modules/Logic.js` | 180 | `this.state.sceneId` | Read runtime scene identifier directly |
| `engine/modules/effect/strategies/Item.js` | 39, 68, 84, 102, 125 | `engine.state.meta?.entryCharacter` | Read runtime metadata directly as fallback owner identity |
| `engine/modules/effect/strategies/Item.js` | 60 | `engine.state.itemInfo[eff.target]` | Read item definition directly for notification text |

### B. Engine-internal coordination state accessed directly

| File | Lines | Direct access | Classification |
|---|---:|---|---|
| `engine/GameEngine.js` | 133 | `isSyncQueueRunning`, `isAsyncQueueRunning` | Internal queue flags mutated directly |
| `engine/GameEngine.js` | 137-170 | `effectQueue.sync/async` and queue flags | Internal queue arrays and flags are pushed, shifted, spliced, and toggled directly |

These fields are engine orchestration state rather than scenario data. Decide explicitly whether they belong in the StateAccess contract or should remain private engine internals. Do not mechanically migrate them as ordinary gameplay keys.

### C. Protocol snapshot reads the raw runtime root

| File | Lines | Direct access | Classification |
|---|---:|---|---|
| `core/protocol/JsonProtocol.js` | 23-24 | `engine.state`, `engine.state[k]`, `engine.state.sceneId`, `engine.state.scenes` | Snapshot serialization reads the raw runtime root |

This may be an intentional serialization boundary because it projects the whole runtime state. If strict encapsulation is required, expose a dedicated immutable runtime snapshot operation rather than routing this through many individual key reads.

## Intentional or non-equivalent matches

- `engine/modules/Loader.js` lines 55-210 builds and normalizes a local, not-yet-installed `state` object. This is bootstrap construction before the runtime StateAccess facade is used. It should not be migrated blindly.
- `state/StateAccess.js` is the implementation of the access layer and necessarily reads/writes `engine.state` internally.
- `engine/GameEngine.persistence.test.js`, `engine/persistence/SaveState.test.js`, `tests/cms-transaction.test.js`, and `tests/engine.headless.test.js` contain direct state setup/assertions for fixtures and behavior tests. These are not production access paths. Examples include `engine/persistence/SaveState.test.js:67,69` and `tests/cms-transaction.test.js:25,33`.
- `api/index.js` exposes a StateAccess facade. Its `state.sceneId` and `state.scenes` getters are compatibility accessors, not raw `engine.state` property reads.
- Calls such as `state.get(...)`, `state.set(...)`, `state.update(...)`, and `state.getRuntimeSnapshot(...)` are not direct key access and are not reported as violations by this audit.

## Adjacent risk: live-reference getters

`StateAccess.getRuntime()`, `getSource()`, and `getSession()` deliberately preserve reference semantics for compatibility. A caller can therefore mutate a returned object without calling `set()` or `update()`. New read-only module code should prefer `getRuntimeSnapshot()`, `getSourceSnapshot()`, or `getSessionSnapshot()`. This is a separate audit dimension from raw property access and should be checked independently.

## Recommended remediation order

1. Replace production gameplay reads in `GameEngine.js`, `Effect.js`, `Logic.js`, and Item effect strategies with explicit StateAccess reads/snapshots.
2. Replace direct mutation of `playerMoveHistory` with an atomic StateAccess update.
3. Decide whether queue flags and queue arrays are private engine internals or first-class runtime state. Prefer moving them out of scenario/runtime state if they are orchestration-only.
4. Give `JsonProtocol` a dedicated immutable snapshot boundary if raw-root access is to be prohibited everywhere outside StateAccess.
5. Keep Loader bootstrap mutation and persistence test fixtures explicitly exempt.
6. Add a CI audit that fails only on newly introduced production raw-state accesses; maintain a reviewed allowlist for intentional boundaries.

## Limitations

Regex does not perform symbol resolution. It can miss aliases such as `const s = engine.state; s.foo`, computed property names, destructuring from aliases, reflective access, and helper functions that return state references. It can also flag harmless comments or strings. Use AST-based analysis for enforcement after this baseline inventory.
