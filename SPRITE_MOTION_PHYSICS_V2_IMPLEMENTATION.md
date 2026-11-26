# Sprite Motion / Physics v2 — Implementation Report

## Status

The v2 architecture is integrated as the only Sprite motion runtime. Compatibility with the v1 motion event/commands and save versions is intentionally removed.

## Completed

- Engine-authoritative initial trajectory generation.
- Cubic Bézier trajectory and derivative-based velocity.
- Runtime start/current position retained while presentation is pending; no early target commit.
- Same-layer circle/sphere collision geometry and subdivision CCD.
- Event-time collision ordering and collision chains across body pairs.
- Impulse-based physics response with mass, restitution and optional friction.
- Penetration correction.
- Engine-generated post-impact segments for both bodies.
- Active target trajectories are sampled at current presentation time and rebased with remaining segment geometry; Bézier remainder is rebased with a bounded local approximation rather than replacing the full target motion with one linear extrapolation.
- Affected active target motion is superseded and cancelled.
- Multi-body final positions are committed atomically through `StateAccess.transaction` after ACK; transaction failure rolls the complete commit back.
- V2 trajectory payload with motion/trajectory/segment identity.
- Client-side v2 trajectory sampling for Bézier and physics segments.
- Presentation ACK validates identity, terminal time, and all required segment IDs.
- Duplicate ACKs are idempotent; altered duplicate identities and stale ACKs are rejected.
- End effects are ACK-gated and tracked separately from authoritative commit; failed end hooks remain retryable and pending hook state is saved/restored.
- Save version 5 persists active trajectories, completed identities, and retryable pending end-hook records; restore republishes active trajectories.
- Old motion descriptor/event, impact-report and completion commands removed.
- Old v1 motion schema removed; strict v2 protocol schema added.
- Scenario schema now exposes collision and physics configuration.

## Test results

- Baseline full suite before hardening: 319/319 passed.
- Hardening full suite: **329/329 passed**.
- Hardening stress suite: **75/75 passed**.
- V2 tests cover trajectory sampling, impulse/momentum, CCD, post-impact motion, collision chains, deterministic replay with identical inputs, moving-target interaction, ACK lifecycle, protocol schema, and save/restore recovery.

## Audit hardening fixes completed

- Pair restitution is identity/order invariant: effective body restitution defaults are resolved symmetrically before pair combination.
- Exact-center overlaps produce a deterministic normal and authoritative depenetration.
- ACK multi-body commits are atomic and recoverable on transaction failure.
- End-hook failures are persisted as retryable pending lifecycle records; duplicate ACK retries the hook and completion publication.
- Active target motion preserves/rebases remaining trajectory segments instead of using a single linear extrapolation.
- Collision event-limit exhaustion is detected only when another event remains and causes the motion to be rejected instead of silently truncating.
- Simulation options and start time are validated.
- Multiple authored intermediate path points use a piecewise Bézier spline that passes through every waypoint.
- Added adversarial and stress tests for ID-order invariance, overlap, invalid parameters, event cap, spline traversal, ACK transaction rollback, end-hook retry, and curved active targets.

## Remaining production-hardening work

These are solver/performance constraints, not v1 compatibility gaps:

1. Replace fixed subdivision CCD with adaptive or analytic TOI where geometry permits.
2. Add broad-phase spatial indexing to reduce pair scans.
3. Expand collider shapes beyond circles/spheres and add contact manifolds.
4. Add fixed-timestep simulation mode and cross-platform determinism policy.
5. Define gameplay-specific collision filters, sleeping/settling, and boundary handling.
6. Add longer-running fuzz/property tests over randomized body counts and collision configurations.

## API/protocol changes

- Engine API: `getAuthoritativeSpriteSimulationV2(...)` and `runAuthoritativeSpriteSimulationV2(...)`.
- Event: `presentation.sprite.trajectory.v2`.
- Cancellation event: `presentation.sprite.trajectory.cancelled`.
- ACK command: `sprite.motion.presentation.ack`.
- Client: `sampleSpriteTrajectoryV2(...)`, `getSpriteTrajectoryAck(...)`, `acknowledgeSpriteTrajectory(...)`.
- Save version: 5.

