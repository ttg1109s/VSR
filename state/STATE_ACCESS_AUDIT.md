# State Access Audit

## Current branch status

- Repository: `ttg1109s/VSR`
- Branch: `feature/restore-password-domain`
- Audit tool: `tools/audit-state-access.js`
- Commands: `npm run audit:state` or `node tools/audit-state-access.js --json`

The current implementation separates gameplay state (`engine.state`) from Engine orchestration state (`engine.runtime`). Effect queues and queue-running flags are owned by the latter and are excluded from save data by construction. The save serializer retains filtering for legacy save-state keys for compatibility.

## Changes made in this pass

- Corrected the `SaveState.js` import to use `../../protocol/JsonProtocol.js`.
- Moved effect queues and queue-running flags out of `engine.state` and into `engine.runtime`.
- Changed effect override reads to use `getRuntimeSnapshot()`.
- Changed the LogicSystem current-scene lookup to use StateAccess.
- Removed direct Engine-state fallback reads from ItemStrategies; owner and item-name reads now use StateAccess snapshots.
- Changed player movement-history append to a StateAccess update.
- Added regression tests for detached snapshots, controlled updates, read-only source state, Engine queue ownership, and save rejection while a queue is active.

## Ownership boundaries

The following direct state access is intentional and must remain narrowly scoped:

- `state/StateAccess.js`: implementation of the state boundary itself.
- `engine/GameEngine.js`: Engine owner, bootstrap/restore assignment, and internal orchestration. Gameplay writes should still use StateAccess where practical.
- `engine/persistence/SaveState.js`: persistence boundary that clones the complete serializable runtime model and validates active work before saving.
- `protocol/JsonProtocol.js`: protocol serialization boundary that creates a detached JSON snapshot.

Do not mechanically move every Engine-owned value into StateAccess. TaskManager timers, queue promises, locks, and orchestration flags are not gameplay state.

## Scanner limitations

The scanner is intentionally described as heuristic. It uses regular expressions, not an AST or symbol table. It improves direct mutation classification, but it cannot reliably resolve lexical scope, alias reassignment, destructuring, computed property access, reflection, or indirect references. It can also produce false positives from strings and non-leading comments. Its output is a candidate list for review, not proof of compliance.

A full AST audit remains a separate engineering task requiring a parser dependency and rules for scope-aware alias tracking. No AST-level completeness claim is made by this branch.

## Verification

The repository now provides:

- `npm test` — Node.js built-in test runner for the checked-in regression tests.
- `npm run audit:state` — heuristic candidate scan.
- GitHub Actions workflow `.github/workflows/engine-quality.yml` — runs both commands on pushes to this branch and pull requests.

The current environment did not execute Node.js against a local checkout. Therefore, the committed tests and workflow are configured but their passing status has not been independently confirmed here. The workflow result is the authoritative runtime verification.
