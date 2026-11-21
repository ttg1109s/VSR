# Test boundaries: Engine vs Demo

This repository has two intentionally separate test responsibilities.

## Engine tests
- Test engine features and contracts only.
- Use independent, minimal JSON fixtures authored specifically for tests and conforming to the scenario schema.
- Do not import, read, reference, or depend on the demo scenario (`demo-script-data.js`, `demo_script.js`, or `DEMO_SCRIPT`).
- Engine test outcomes must not change when demo content, dialogue, actions, branches, items, progression, or narrative is edited.
- Feature tests may exercise schema-valid runtime behavior (loading, state, actions, requirements, effects, movement, save/restore, protocol, etc.) using their own fixtures.
- If a test requires demo content to pass, it is not an Engine test; remove it or rewrite it around an independent fixture.

## Demo tests
- Demo tests only validate that the Demo JSON conforms to the canonical JSON Schema.
- Do not test gameplay, progression, branch behavior, reward wiring, dialogue, action visibility, route reachability, or narrative expectations.
- Use JSON Schema validation only for the Demo check. Do not run scenario semantic/gameplay validation as part of this test.

## CI enforcement
- Keep the test groups visibly separated.
- Add/maintain a guard so Engine test files cannot import Demo data.
- A Demo content change must only affect the Demo schema-validation test (and never Engine feature tests).


## CI modes

### Fast test (push)
- Runs on pushes to `engine-only`.
- Executes schema validation, server checks, and the unit test suite.
- Skips browser installation/tests, UI/safe-area/dead-code audits, build, and strict state audit.
- Optimized for frequent development commits and quick feedback.

### Full test (pull request)
- Runs on pull requests targeting `engine-only`.
- Executes the full suite: schema/server checks, UI and safe-area audits, dead-code audit, build, browser tests, all tests, and strict state audit.
- Provides comprehensive validation before merge.

### Deploy
- Deployment is separate from ordinary development pushes.
- Trigger Pages deployment manually after Full test passes, or through an explicit release/deploy event.
- Ordinary pushes to `engine-only` must not run full validation or deployment.
