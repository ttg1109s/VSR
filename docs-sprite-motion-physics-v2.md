# Sprite Motion / Physics v2

## Architecture

Engine owns motion planning, trajectory timelines, collision detection, collision resolution, physics response, post-impact trajectories, runtime positions, active motion identity, save/restore, and completion lifecycle. Client is a renderer and follows protocol v2 trajectories.

## Motion flow

1. Schema provides initial motion configuration.
2. Engine derives the runtime start/end and initial cubic trajectory.
3. Engine snapshots same-layer collision bodies and their current/active trajectories.
4. Engine performs subdivision CCD over the simulation horizon.
5. First and subsequent collision events are resolved in event-time order.
6. Physics-enabled collisions apply mass, relative velocity, restitution, friction and positional correction to both bodies.
7. Engine generates post-impact segments and final positions for affected bodies.
8. Engine publishes `presentation.sprite.trajectory.v2`.
9. Client samples/interpolates the provided trajectory and ACKs all required segments.
10. Engine validates motion/trajectory identity and ACK completion, commits all affected positions, runs end effects and publishes trajectory completion.

## Protocol

V2 event: `presentation.sprite.trajectory.v2`.

V2 ACK command: `sprite.motion.presentation.ack`.

The previous `presentation.sprite.motion`, `sprite.motion.complete`, and Client-authoritative `sprite.motion.impact` contracts have been removed. No compatibility adapter is provided.

## Physical configuration

Sprite collision: `collision.enable`, `collision.radius`.

Sprite physics: `physics.mass`, `physics.restitution`, `physics.friction`, `physics.gravity`.

Motion physics: `motion.physics.horizon`, `restitution`, `friction`, `gravity`.

## Persistence

Save format version 5 stores active authoritative trajectory state, completed-motion identity, sequence state, and retryable pending end-hook lifecycle records. Restore rehydrates and republishes active trajectories. V4 and earlier save formats are not accepted.

## Current solver limits

- Collision shape: circle/sphere radius.
- CCD: fixed-subdivision linearized pair time-of-impact approximation.
- Broad phase: pairwise scan; O(n²).
- Event cap: configurable maximum collision events; if another event remains after the cap, the motion is rejected rather than silently truncated.
- Determinism: stable pair ordering and identical input snapshot produce repeatable outputs; no fixed-step cross-platform floating-point guarantee.
- Moving active targets: remaining trajectory segments are rebased and preserved for collision prediction; an affected active trajectory is superseded. Bézier rebasing is a local approximation of the remaining curve.

These limits are explicit. The architecture is authoritative, but the collision kernel should be upgraded before high-speed/high-body-count production physics workloads.

## Audit hardening (completed)

- Pair restitution is independent of Sprite ID ordering.
- Exact-center overlaps have deterministic normals and depenetration.
- Multi-body ACK commit is atomic.
- End-hook failure remains retryable and is persisted.
- Invalid simulation parameters fail closed.
- Multiple authored intermediate waypoints are traversed by a piecewise Bézier spline.
- Collision-event cap truncation is surfaced as motion rejection.
- Regression and stress coverage added for these cases.

Latest validation: full test suite 329/329 pass; stress suite 75/75 pass.


### Exact-center fallback convention (corrective pass)

When collider centers coincide and no geometric normal exists, CCD and impulse resolution use a deterministic +X fallback. Relative normal velocity is then evaluated consistently: approaching pairs receive an impulse, while separating pairs are not given a spurious impulse. This deterministic convention resolves the zero-vector ambiguity but does not establish a unique geometric normal or guarantee pair-order symmetry at exact center.
