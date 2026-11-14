# Password Domain Restoration

## Scope in this branch

This branch introduces a headless Password domain boundary and restores a first slice of challenge lifecycle behavior without reintroducing the removed DOM renderer.

## Implemented

- `engine/modules/password/PasswordSystem.js`: creates per-open challenge IDs, records action/scene/router/type/password identity, owns `countTest`, enforces `retryMax` and checks Engine-side deadlines.
- `engine/modules/Action.js`: opens the domain challenge, includes its challenge ID and attempt metadata in the existing keyboard presentation event, and releases the global action lock while the player interacts.
- `engine/GameEngine.js`: requires the challenge ID on submit, rejects stale IDs and wrong scene/router context, keeps the challenge active after a wrong answer while attempts remain, and closes on success, cancellation, exhaustion or an expired submit.
- `engine/modules/password/verify.js`: fixes falsy-value handling (including numeric zero), preserves leading-zero strings, adds configurable case sensitivity and validates Find Way bounds/endpoints/adjacency before exact path comparison.
- `tests/password.domain.test.js`: covers unlimited and bounded attempts, deadline checks, terminal-state idempotency, zero/leading-zero values, case policy and malformed Find Way paths.
- The existing Engine Password protocol test now checks challenge-ID binding and retry behavior.

## Runtime contract

The client submits only `actionId`, `challengeId`, and raw `input` (or `cancel: true`). It must not submit a success flag, retry counter, password config or answer. The Engine resolves the password definition from the loaded scenario and verifies the submitted input.

`retryMax = 0` means unlimited wrong attempts. For a positive value N, the Nth wrong submission exhausts the challenge. Intermediate failures do not run `pwFailed`; the effect runs once at exhaustion. Cancel does not consume an attempt. Success runs the normal pass path.

## Explicitly incomplete / follow-up required

This is not yet a full restoration of every legacy Password renderer/strategy.

1. Puzzle currently fails closed in `verifyPassword`: the legacy client token `solved` is not accepted as proof. A server-owned tile-state model and legal-move validator must be implemented before Puzzle can succeed securely.
2. The Engine schedules an automatic timeout task for each active challenge, closes it at the deadline, clears the pending state and emits `password.expired`. A restored challenge re-arms its timeout using the persisted absolute deadline.
3. Find Way currently validates the submitted path against the exact configured street. It does not model interactive drawing state in the Engine.
4. Presentation still uses the existing keyboard adapter event. Dedicated typed, versioned `password.open/retry/success/exhausted/expired/cancelled/closed` events and per-strategy UI adapters remain follow-up work.
5. Save/restore carries the pending challenge and re-arms its timeout after validating the saved action, scenario definition, scene and router. The Engine headless suite now includes a live-challenge save/restore test that checks automatic expiry in both the original and restored Engine. Presentation replay and legacy renderer compatibility still require integration coverage.
6. Legacy Number modes, String hint/revealed-character mechanics, Switch multi-state mechanics and old `mechanica` scenario migration have not been fully reimplemented or verified.
7. The current schema describes `pwFailed` as running on a wrong password. This branch follows the existing Action.js intent comment and runs it only on exhaustion. The schema wording should be clarified or a policy field introduced.
8. Timeout effect policy remains unspecified; the current branch returns an expired result without running `pwFailed` or a dedicated timeout effect.

## Verification status

The branch has not been executed in a local Node runtime or CI from this GitHub session. Run `npm test` (Node >=20) before merging. Do not treat this branch as production-complete until the incomplete items above have tests and implementation.
