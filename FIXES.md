# Engine primitive audit fixes

Applied the previously identified P1/P2/P3 findings in one pass.

## Changes

- Requirement evaluation now propagates invalid nodes through nested gates, so `NOT` cannot convert malformed or missing references into a pass. Runtime shape and static-reference checks are stricter.
- Requirement-template semantic validation recursively checks nested references and detects cycles.
- `set/action_count` is direct assignment only: `mode` is unsupported, `add` is removed from the schema contract, zero is accepted, and the requirement-check schema no longer exposes the unsupported `set/action_count` subtype.
- Terminal password failures increment `pwFailed` regardless of whether a `pwFailed` hook is authored.
- Source state getters return detached clones.
- `manage_effect` Action scope resolves source effects from global `src.actions`.
- CMS Router action mutations now drive effective Action membership and reject unknown Action IDs when source definitions are available.
- Router targets resolve globally across Scenes for `set.router`, CMS, `manage_effect`, and `goto router`.
- Character movement mutations validate stable IDs and normalize visit counters; replacement preserves stable identity/counter. Runtime movement list changes are compatible with save/restore.
- Save restore requires canonical runtime domains and validates runtime movement entries/indices/scenes.
- `init({enterScene:true})` fails explicitly if the entry Scene cannot be entered; Scene/Router entry now returns explicit success results.
- `maxCharacterMoving` is implemented as a concurrency limit with queued movement scheduling and queue draining.
- `minTransition` defaults consistently to 2 seconds and clamps authored/runtime Scene durations.
- Resolver arguments use consistent literal parsing, quoted arguments work, and `$calc` unary/exponent precedence is corrected.
- `caseSensitive` is exposed in password number/string schemas and is covered by tests.

## Verification

Run:

```bash
node --experimental-default-type=module --test tests/*.test.js
```

Result: **295/295 tests passed**.
