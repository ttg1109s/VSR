# VSR hardening roadmap

This document tracks the five proposed hardening stages. It distinguishes repository changes from work that still requires implementation and runtime verification.

## Stage 1 — Security hardening

- [x] Add deployment-boundary security guidance.
- [x] Add a CI test workflow with read-only repository permissions.
- [ ] Verify every network adapter derives principal from trusted authentication.
- [ ] Review command authorization coverage and default policy for each deployment mode.
- [ ] Add tests for unauthorized commands, principal spoofing, and sensitive event/snapshot projection.
- [ ] Perform dependency and static security review.

## Stage 2 — Transaction and consistency

- [ ] Define mutation/commit boundaries for every command and effect.
- [ ] Design durable idempotency records with principal, command fingerprint, result, and retention policy.
- [ ] Implement persistence-backed idempotency with atomic mutation semantics.
- [ ] Add restart, retry-after-commit, duplicate, and cache-eviction tests.
- [ ] Verify restore/import validation and failure rollback.

## Stage 3 — Concurrency architecture

- [ ] Document queue ownership and ordering invariants for protocol, state, scene, effect, automation, chat, and movement.
- [ ] Define cancellation and lifecycle-generation rules.
- [ ] Add cross-subsystem stress tests and deterministic scheduler/fake-clock tests.
- [ ] Audit nested queue waits for deadlock and starvation.

## Stage 4 — Modularization

- [ ] Keep GameEngine as composition root.
- [ ] Extract command registration into command registry modules.
- [ ] Extract lifecycle coordination and snapshot projection where ownership is clear.
- [ ] Add dependency-boundary tests.
- [ ] Refactor only with behavioral parity tests.

## Stage 5 — Performance and observability

- [ ] Establish baseline benchmarks for validation, snapshot projection, cloning, event throughput, and memory.
- [ ] Add structured error categories and trace/correlation IDs.
- [ ] Add metrics for queue depth, task latency, command outcomes, retries, and runtime resets.
- [ ] Add long-duration soak tests and memory-retention checks.

## Verification status

The repository previously had no root package manifest or CI workflow. This commit establishes Node test execution and CI, but tests have not been run in a local checkout in the authoring environment. Stages 2–5 are not complete and must not be considered production-ready based on this roadmap commit.
