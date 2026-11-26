# Sprite Motion — recovery, collision, physics, diagnostics implementation

## Recovery contract

- Authoritative simulation state is committed only after validated presentation ACK, and multi-body state commit uses the engine state transaction.
- Presentation completion identity is deduplicated in runtime state; restore republishes pending authoritative trajectory.
- Existing engine save/restore remains snapshot based and is not itself an fsync/process-kill durability guarantee.
- `DurableOperationLedger` is an append-only fsync-backed JSONL operation ledger for external operations. Completed operations are deduplicated after restart. The handler receives an idempotency key; the external side-effect provider must honor that key. The ledger cannot create exactly-once semantics for an external provider that neither supports idempotency nor shares a transaction.
- End-hook effects in the core engine remain runtime/save-envelope retry-ledger effects. The durable ledger is available for integrations but is not automatically wired to every effect handler because the engine has no durable-storage/provider configuration contract. Do not claim exactly-once for those effects.

## CCD guarantee

- Constant-velocity linear/zero-acceleration trajectory pairs use analytic circle TOI.
- Supported physics acceleration, cubic Bezier, and Bezier-chain trajectories use conservative interval bounds and interval refinement.
- Unknown/custom trajectories return a conservative potential-collision fallback instead of silently returning no collision. This may produce false-positive collision candidates; callers should treat `approximation` metadata as part of the result.
- Conservative interval leaves are not exact TOI. A collision may be reported within the unresolved interval. The returned interval/time metadata permits debugging and tolerance selection.
- Bounds are analytic for the implemented trajectory descriptor forms. Custom easing callbacks are not serialized and are outside the formal guarantee.

## Physics architecture

- Existing authoritative coordinator is still circle/sphere response.
- New standalone collider API supports circle, box, convex polygon, capsule, compound, local offset, rotation, and positive scale, with shape-specific overlap queries and AABB.
- New standalone 2D rigid-body solver supports linear/angular state, torque through angular acceleration, inertia, contact-point impulses, friction, multiple contacts, and positional correction.
- These standalone modules are not yet substituted into the existing Sprite protocol coordinator. Protocol/schema integration requires a collider field and compatibility/migration contract, intentionally not inferred from existing radius fields.

## Diagnostics

- Collision timeline and profiler are serializable.
- Failure snapshot format `vsr.sprite.failure-snapshot.v1` captures seed, scenario, inputs, runtime, simulation result and error.
- Offline visualizer at `tools/sprite-debug/index.html` renders segment timelines and collision markers.
- Benchmark entrypoint `tests/sprite-physics/benchmark.js` produces fixed sparse-scene workloads.

## Verification

Run `npm test`, `node tests/sprite-physics/benchmark.js`, and open the offline visualizer with exported JSON. Property/fuzz/crash tests are deterministic and local; this repository does not currently contain a third-party reference solver, so differential validation against one is not claimed.

## Replay

`replay.js` supports serializable physics, Bezier, Bezier-chain, and linear trajectory descriptors. `createSpriteReplay()` creates a replay bundle with stable fingerprint; `replaySpriteSimulation()` reconstructs and reruns it. Custom callback trajectories are intentionally rejected because they cannot be serialized deterministically.

## Hook integration

`GameEngine` accepts an optional `spriteOperationLedger` adapter. Sprite start/end runnable contexts now receive stable per-runnable `operationId` and `idempotencyKey`; `EffectSystem` calls the injected adapter's `run(key, handler)` around the runnable. The adapter must durably deduplicate and pass the key to external effects. If no adapter is configured, legacy save-envelope hook ledger semantics remain in force. This makes the durability contract opt-in and explicit rather than silently assuming that runtime markers are durable.

## 3D foundation added (single-pass implementation update)

- Added `engine/modules/sprite/physics3d/RigidBodyWorld3D.js` and public exports.
- Canonical 3D transform is XYZ plus normalized quaternion `[w,x,y,z]`; simulation time `t` and tick are explicit.
- Implemented fixed timestep, dynamic/static/kinematic/sensor bodies, sphere contacts, gravity/forces/torques, impulses, angular velocity, material restitution/friction, damping, sleep dwell, timed impulse idempotency, energy diagnostics, checkpoints, and restore.
- Added state schema and 3D physics tests.
- This 3D runtime is currently a separate opt-in foundation; existing Sprite trajectory v2 and existing collision coordinator remain in place for compatibility.
- Subsequent full-pass extension: added shared constrained-2D profiles (XY/XZ/YZ), legacy transform adapter, protocol v3 serializer/validator/schema, and `SpriteSimulationCoordinator3D` which runs to natural-rest or watchdog-failure and serializes body snapshots/events/trajectory samples; 3D narrowphase supports sphere/sphere, sphere/AABB, AABB/AABB, sphere/plane. Explicit sphere CCD uses analytic swept TOI with one CCD event per body per fixed step.
- Current limitations: AABB boxes are not oriented; CCD remains sphere/sphere only and multi-impact CCD is not handled; scalar inverse inertia approximates boxes; no contact islands, GJK/EPA convex hull, capsule/compound/dynamic mesh collider, broadphase acceleration for the 3D world, or cross-platform bitwise determinism guarantee. Sprite's legacy coordinator still publishes protocol v2 and is not yet switched to the new 3D world for authoritative motion.
- Tests in the current full pass: full suite 370/370, stress suite 76/76. A separate 3D benchmark was added; results are informational and reflect the current all-pairs narrowphase. The upgrade is not yet a full replacement of the legacy Sprite motion coordinator.
