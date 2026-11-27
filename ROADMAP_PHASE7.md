# Phase 7 implementation notes

Issue: https://github.com/ttg1109s/vsr/issues/7

## ACK and transaction semantics

The JSON protocol now accepts an optional `transactionProvider`. Commands run inside the transaction returned by that provider. Success handlers and the success hook complete before transaction commit, and a success ACK is cached only after commit. Handler, success-hook or commit failures invoke rollback before a failure ACK is cached. Rollback failures are surfaced as `ROLLBACK_FAILED` with the rollback error attached; they are never represented as a successful rollback. Existing callers without a transaction provider retain their current behavior.

## Physics checkpoint contract

Rigid-body checkpoints carry format `vsr.rigidbody-world.checkpoint`, version 2 and physics model identity. Checkpoints are deep-detached. Restore validates compatibility, configuration, unique body identities and pending operations in staging structures before replacing live state. Transient events and diagnostics are cleared after restore.

## Deterministic replay contract

New Sprite replay envelopes use `vsr.sprite.replay.v2`, canonical sorted trajectory descriptors, deterministic fingerprints and explicit trajectory-schema/physics compatibility metadata. Validation rejects tampering and unsupported schemas, while supporting an explicit legacy-v1 compatibility path. Replay result equivalence is compared by deterministic fingerprints.

## Boundary

This does not serialize arbitrary JavaScript closures, opaque easing callbacks, external side effects or transport internals. Those must be expressed as serializable descriptors or coordinated by an idempotent external operation ledger. Existing durable Sprite hook ledger remains responsible for external-effect deduplication.
