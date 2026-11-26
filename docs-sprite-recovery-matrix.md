# Sprite recovery boundary matrix

This matrix records the implemented behavior and the limits of the recovery contract.

| Boundary | Expected recovery behavior | Coverage |
|---|---|---|
| Invalid/malformed save before runtime replacement | Reject input; live runtime remains unchanged | `fault injection contract: malformed restore input is rejected without replacing live runtime` |
| Runtime replacement followed by rehydration failure | Restore prior runtime references/state and rehydrate old tasks; fail closed only if rollback rehydration fails | `fault injection contract: restore failure after runtime replacement rolls back the previous runtime` |
| Successful restore | Lifecycle generation advances, old callbacks become stale | `fault injection contract: restore runtime-generation boundary invalidates old callbacks` |
| Presentation ACK identity/segment/time validation failure | Reject ACK before authoritative state commit | Sprite-system ACK validation tests |
| Multi-body ACK commit transaction failure | Roll back all body commits | `ACK multi-body commit transaction rolls back completely on injected commit failure` |
| Authoritative commit completed, end hook fails | Commit remains authoritative; pending end hook is retryable and serialized in save envelope | `ACK end-hook failure is retryable after authoritative commit and completion publication` |
| Duplicate ACK after completed motion | Return duplicate success; do not recommit body positions or create another completion | Sprite-system duplicate ACK tests |
| Persisted end-hook wrapper already marked started | Legacy save-envelope retry skips that wrapper index (at-most-once policy) | `fault injection contract: hook ledger is at-most-once for persisted started wrapper indexes` |
| Process killed after atomic save checkpoint | Fresh engine restore reconstructs checkpoint state | `sprite-recovery/process-restart.test.js` process-kill test |
| Truncated checkpoint JSON | Reject; existing runtime remains intact | `sprite-recovery/process-restart.test.js` truncated checkpoint test |
| External hook runnable with injected operation ledger | Stable operation ID; adapter deduplicates completion and external handler receives idempotency key | `sprite-recovery/durable-ledger.test.js` |

## Important guarantee boundary

This is **not exactly-once delivery**. The hook ledger is only as durable as the last save/checkpoint. A process crash after a side effect but before a checkpoint can still replay the effect on restore; a wrapper marked started but failing before its side effect is intentionally skipped on retry, which can lose that effect. The optional `spriteOperationLedger` adapter is integrated into Sprite start/end runnable execution and supplies stable operation IDs/idempotency keys. Exactly-once external effects still require the external side-effect provider to enforce that key or share a transaction/outbox. Without an injected adapter, legacy save-envelope markers remain at-most-once/retry-oriented.
