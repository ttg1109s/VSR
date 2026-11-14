# State Access Audit — Historical Baseline

> **Status: historical, not a current audit.** This document records findings from an earlier repository revision. Its file paths, line numbers, and findings must not be treated as verified against the current branch.

- Repository: `ttg1109s/VSR`
- Original branch: `patch`
- Original audited commit: `509d7df673903d26bb566567adaa2c77cf2f27dc`
- Original method: repository-wide JavaScript scan using targeted regular expressions for raw `this.state.*` and `engine.state.*` property access, followed by manual context classification.
- Original scope: 44 tracked JavaScript files in that Git tree.
- Scanner: `tools/audit-state-access.js`
- Run from the repository root: `node tools/audit-state-access.js`; add `--json` for machine-readable output.

## Historical findings

The original scan identified direct runtime/gameplay state access outside the StateAccess abstraction in these areas:

- `engine/GameEngine.js`: scene, character, automation, and movement-history state.
- `engine/modules/Effect.js`: effect override state.
- `engine/modules/Logic.js`: current scene state.
- `engine/modules/effect/strategies/Item.js`: entry-character metadata and item definitions.
- The protocol snapshot implementation: direct access to the runtime state root for serialization.

It also identified direct access to Engine-internal effect queue arrays and coordination flags. Those are orchestration details and should be evaluated separately from scenario/gameplay state.

These findings describe the original audited commit only. The protocol implementation has since moved to `protocol/JsonProtocol.js`; therefore, historical references to `core/protocol/JsonProtocol.js` are not current paths. Original line numbers are not expected to match the current source.

## StateAccess design considerations

The StateAccess implementation provides explicit namespace-aware access to source, runtime, and session state. Scenario source is read-only through the facade. Snapshot methods clone returned values for read-only use.

Legacy methods such as `getRuntime()`, `getSource()`, and `getSession()` retain reference semantics for compatibility. A caller that mutates a returned object can therefore bypass `set()` or `update()`. New read-only module code should prefer `getRuntimeSnapshot()`, `getSourceSnapshot()`, and `getSessionSnapshot()`.

Engine coordination structures such as effect queues and queue-running flags are not automatically equivalent to gameplay state. Their ownership should be decided explicitly; they should not be migrated mechanically into the StateAccess schema.

## Re-audit procedure

To establish a current baseline:

1. Run `node tools/audit-state-access.js` on the target branch and record the exact commit SHA.
2. Review each match against the current source; distinguish runtime/gameplay state from bootstrap construction, StateAccess internals, protocol serialization, and Engine orchestration.
3. Verify aliases, computed properties, destructuring, and indirect references manually. The regular-expression scanner cannot resolve symbols.
4. Update this document only with findings reproduced on that commit, including current paths and line numbers.
5. If the audit is used in CI, enforce only newly introduced production violations and maintain a reviewed allowlist for intentional boundaries.

## Limitations

The scanner uses targeted regular expressions rather than full AST or symbol analysis. It can miss aliases such as `const state = engine.state; state.foo`, computed property names, destructuring from aliases, reflective access, and helper functions that return state references. It can also flag harmless comments or strings. Treat its output as a review aid, not proof of correctness or completeness.

No current-branch scan is claimed by this historical report.
