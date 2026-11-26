# VSR Engine Next — 3D-Native Architecture Specification

**Status:** Proposed architecture baseline  
**Scope:** Core lifecycle, protocol contracts, simulation/physics, Sprite integration, recovery, diagnostics, deterministic replay, 2D constrained mode and 3D upgrade path  
**Base source:** `vsr_sprite_recovery_physics_diagnostics_hardened.zip` (review findings summarized in the conversation)  
**Principle:** Keep the existing Core where it is sound; replace the authoritative fixed-horizon Sprite physics coordinator with a 3D-native deterministic simulation world. Do not perform a repository-wide rewrite.

---

## 0. Executive decisions

1. Physics is **3D-native**. The 2D mode is a constrained profile of the same state, collision, solver and protocol contracts—not a separate engine.
2. Every transform is `position (x,y,z) + orientation (r)`; time `t` is explicit in simulation state, trajectory samples, events, checkpoints and output. `r` is quaternion orientation `[w,x,y,z]` internally.
3. Authoritative simulation uses fixed-step integration and deterministic ordering. Simulation duration is not fixed. Completion is state-driven; a watchdog produces a non-success terminal reason.
4. Motion is split into **kinematic**, **dynamic force-driven**, **impulse-driven dynamic**, and **sensor** behavior. Duration is valid only for authored/kinematic motion or explicit scheduled operations.
5. One authoritative pipeline owns body state, geometry, contacts, CCD, solver, friction, angular state, sleeping, energy diagnostics and completion.
6. One unified collider/contact/solver pipeline supports 2D constrained and 3D profiles. Shapes are introduced incrementally but share contracts.
7. Engine `init()` is transactional: build/validate/initialize/enter in staging; atomic swap on success; old runtime remains intact on failure.
8. Protocol schemas are executable CI contracts for every producer/consumer. Schema drift fails CI.
9. Presentation ACKs acknowledge presentation consumption/recovery only; they never determine physical completion or mutate physical truth.
10. Save, restore, replay and durable operations are versioned, deterministic, fault-tested, and explicit about exactly-once limitations.
11. Existing code is migrated behind adapters; old coordinator is removed only after parity and acceptance gates.

## 1. Canonical dimensional model

### 1.1 Transform contract

```ts
interface Transform3 {
  position: Vec3;       // x,y,z
  orientation: Quat;    // r; normalized [w,x,y,z]
}
```

```ts
type Vec3 = [number, number, number];
type Quat = [number, number, number, number]; // [w,x,y,z]
```

- Position, linear velocity, force, impulse and acceleration are 3-vectors.
- Orientation is a unit quaternion. Euler angles are input/output convenience only.
- Angular velocity, torque and angular impulse are 3-vectors.
- Time `t` is simulation seconds, monotonically increasing inside a simulation run.
- Never use wall-clock timestamps as physics time.
- Every externally visible simulation result carries `simulationId`, `simulationVersion`, `tStart`, `tEnd`, and fixed-step configuration.
- In constrained 2D mode: `z=0`, rotation only around the permitted axis, and forbidden components are projected/validated. This is a profile, not a second physics implementation.

### 1.2 Canonical state

```ts
interface BodyState3 {
  id: BodyId;
  bodyType: "static" | "kinematic" | "dynamic" | "sensor";
  enabled: boolean;
  transform: Transform3;
  linearVelocity: Vec3;       // v
  angularVelocity: Vec3;      // omega
  linearAcceleration?: Vec3;  // diagnostics/derived, not necessarily serialized as authority
  mass: number;
  inverseMass: number;
  inertiaLocal: Mat3;
  inverseInertiaLocal: Mat3;
  materialId: MaterialId;
  colliderId: ColliderId;
  awake: boolean;
  sleepTimer: number;
  accumulatedForce: Vec3;
  accumulatedTorque: Vec3;
}
```

Derived values are not duplicated as independent authority. Mass/inverse mass and inertia/inverse inertia must be normalized by factory/validation. Static bodies have zero inverse mass/inertia. Kinematic bodies have prescribed motion and do not respond to solver impulses, though they may impart contact velocity to dynamic bodies.

### 1.3 Time contract

```ts
interface SimulationTime {
  t: number;                 // simulation time in seconds
  tick: number;              // integer fixed-step index
  fixedDt: number;           // seconds
  accumulator?: number;      // runner only; not authoritative replay input
}
```

The authoritative step is fixed `dt` (default candidate 1/120 s; config is versioned). Wall-clock accumulator belongs to the runner/presentation adapter. A simulation run is not capped by a normal motion duration.

## 2. Motion modes

### 2.1 Kinematic

Authored transform/time trajectory. Valid duration and keyframes. Collision behavior is explicit (`detect-only`, `block`, or `scripted-response` policy). Kinematic motion does not use force integration as its authority.

```json
{
  "type": "kinematic",
  "trajectory": { "type": "keyframes", "space": "world", "keys": [] },
  "collisionPolicy": "detect-only"
}
```

### 2.2 Dynamic force-driven

```json
{
  "type": "dynamic",
  "initialState": {
    "position": [0,0,0],
    "orientation": [1,0,0,0],
    "linearVelocity": [0,0,0],
    "angularVelocity": [0,0,0]
  },
  "forces": [],
  "material": "default"
}
```
Natural rest/sleep ends motion; no authored duration required.

### 2.3 Impulse-driven

An impulse is an event at explicit simulation time or tick. It instantaneously changes linear and angular velocity. It may wake a sleeping island. An impulse schedule is deterministic and ordered by `(t, sequence, operationId)`.

### 2.4 Sensor

Sensor bodies generate overlap/enter/exit events and never solve impulses. Sensor behavior and event ordering are contract-tested.

## 3. World and module architecture

```text
Scenario / Gameplay
       |
Core Runtime (Lifecycle, Commands, Transactions, State, Hooks)
       |
Simulation API / World Manager
       |
+-------------------------------------------------------+
|  SimulationWorld (authoritative, 3D-native)            |
|  Time/Step | Body Registry | Forces | Islands | Sleep  |
|                                                       |
|  Broadphase -> Narrowphase -> Manifolds -> CCD/TOI     |
|                   -> Unified Contact Solver           |
|                   -> Position Correction              |
|                   -> Energy/Diagnostics/Completion    |
+-------------------------------------------------------+
       |
Simulation Output / immutable snapshots / events / replay data
       |
Sprite Adapter -> Presentation -> ACK (presentation only)
```

### Proposed folder structure

```text
engine/
  core/
    Lifecycle.js
    RuntimeBuilder.js
    RuntimeTransaction.js
    CommandBus.js
    EventBus.js
    StateStore.js
  simulation/
    SimulationWorld.js
    SimulationRunner.js
    SimulationClock.js
    SimulationSnapshot.js
    SimulationTransaction.js
    CompletionEvaluator.js
    Determinism.js
  physics/
    math/
      Vec3.js
      Quat.js
      Mat3.js
      Transform3.js
    body/
      Body.js
      BodyFactory.js
      BodyState.js
    force/
      ForceRegistry.js
      Gravity.js
      Drag.js
      Damping.js
      CustomForce.js
    integration/
      Integrator.js
      SemiImplicitEuler.js
      AngularIntegrator.js
    geometry/
      Shape.js
      Sphere.js
      Box.js
      Capsule.js
      ConvexHull.js
      Compound.js
      Plane.js
    collision/
      Broadphase.js
      SpatialHash3D.js
      AABB.js
      Narrowphase.js
      ContactManifold.js
      CCD.js
      TOI.js
    solver/
      ContactSolver.js
      VelocitySolver.js
      PositionSolver.js
      FrictionSolver.js
      IslandSolver.js
    material/
      Material.js
      MaterialMixing.js
    energy/
      EnergyLedger.js
      EnergyDiagnostics.js
    sleep/
      SleepManager.js
      IslandSleep.js
    diagnostics/
      PhysicsProfiler.js
      FailureSnapshot.js
      Replay.js
  modules/Sprite/
    SpriteSimulationAdapter.js
    SpriteMotionAdapter.js
    SpritePresentationAdapter.js
  protocol/
    protocol.schema.json
    simulation-v3.schema.json
    sprite-motion-v3.schema.json
  persistence/
    SaveRestore.js
    SaveMigration.js
    save.schema.json
```

### Dependency rules

- Physics imports no gameplay-specific modules.
- Simulation owns physics state and does not depend on renderer/presentation.
- Sprite adapter maps Sprite descriptors to simulation bodies/commands and maps outputs back to protocol.
- Presentation is a consumer of immutable simulation output.
- Core transaction boundaries govern runtime install and externally visible effects.

## 4. Fixed-step simulation loop

Default candidate: `fixedDt = 1/120 s`; configurable and versioned. Use semi-implicit Euler as the first integrator; consider higher-order integration only after invariant tests and deterministic constraints are defined.

```text
step(t, dt):
  1. Process scheduled operations in stable order
  2. Wake affected bodies/islands
  3. Evaluate forces and torques
  4. Integrate dynamic velocities
  5. Predict transforms
  6. Broadphase candidate pairs
  7. Narrowphase contacts/manifolds
  8. CCD/TOI; conservatively advance or subdivide where required
  9. Solve normal impulses, restitution, friction and angular effects
 10. Position correction / stabilization
 11. Integrate final transforms/orientation
 12. Update contact islands
 13. Update energy diagnostics and sleep timers
 14. Evaluate natural completion
 15. Emit ordered events and checkpoint/diagnostic data
```

The exact ordering of force integration, collision detection and position integration must be fixed in the implementation ADR and regression tests. The above is a baseline; CCD may require a substep/event-driven internal loop without changing the outer fixed tick.

## 5. Collision and geometry

### 5.1 Unified collision pipeline

- Broadphase: spatial hash/grid initially for typical Sprite workloads, with interface allowing dynamic AABB tree later.
- Narrowphase: shape pair algorithms produce manifolds, not booleans.
- Contact manifold: contact points, normal, penetration, stable feature identifiers, TOI and approximation metadata.
- CCD: exact analytic methods where supported; conservative bounded methods otherwise.
- `uncertain` must never silently become `no-hit`.
- Pair/event ordering stable by canonical body IDs and feature IDs.

### 5.2 Initial 3D shape support plan

1. Sphere (first parity target; maps existing circle/sphere code).
2. Box/OBB.
3. Capsule.
4. Convex hull using GJK distance and EPA penetration where validated.
5. Compound collider.
6. Plane/infinite ground representation.

Do not claim general concave collision in phase one. Concave static geometry is represented by compound convex parts or a future mesh acceleration structure. Dynamic concave meshes are out of scope for the first physics release.

### 5.3 2D constrained profile

`dimensionMode: "2d-constrained"`:
- `z=0`, `vz=0`.
- Rotation allowed only about configured plane normal (default Z); other angular components zero.
- 2D shape mappings are adapters into 3D geometry or dedicated constrained algorithms, but share Body/World/Contact/Solver contracts.
- Reject invalid out-of-plane force/torque or project them only if policy explicitly says `project`.
- No separate authoritative 2D coordinator.

## 6. Rigid-body solver

Use one solver pipeline. For 3D rigid body contact, effective mass includes translational and rotational terms. Solver supports:
- Normal impulse and restitution.
- Tangential impulse and static/dynamic friction.
- Angular velocity and inertia tensor.
- Multiple contact points.
- Iterative velocity solve.
- Position stabilization/correction.
- Contact islands.

Solver config is captured in replay:

```json
{
  "velocityIterations": 10,
  "positionIterations": 4,
  "maxIterations": 24,
  "tolerance": 1e-5,
  "baumgarte": 0.2,
  "restitutionVelocityThreshold": 0.5
}
```

Numbers are baseline candidates, not universal physical constants; benchmark and test before locking defaults.

## 7. Friction, damping, energy

Separate these mechanisms:

- Static friction: prevents sliding while required tangential impulse is within `muStatic * normalConstraint`.
- Dynamic friction: opposes tangential sliding and is bounded by the friction cone.
- Rolling resistance: optional torque/resistance model.
- Damping/drag: velocity-dependent global/medium force, not a synonym for surface friction.

Material contract:

```json
{
  "restitution": 0.2,
  "staticFriction": 0.6,
  "dynamicFriction": 0.4,
  "rollingResistance": 0.01,
  "linearDamping": 0.0,
  "angularDamping": 0.0
}
```

Material mixing rule is explicit and versioned (baseline proposal: geometric mean for friction, max or documented average for restitution; select and test one policy). Do not silently inherit different rules in modules.

Energy diagnostics:
- Translational kinetic: `0.5*m*|v|^2`.
- Rotational kinetic: `0.5*omega^T*I_world*omega`.
- Potential energy for configured conservative forces.
- Track work by external forces and estimated dissipation by friction, restitution and damping.
- Energy residual is diagnostic with tolerance; not exact equality due numerical/contact approximations.
- Detect unexplained energy gain and include it in failure snapshots.

## 8. Natural termination and sleeping

A body is a sleep candidate only if:
- Linear velocity below threshold.
- Angular velocity below threshold.
- No significant external force/torque.
- Stable contact state.
- Condition persists for configured dwell time.

Sleeping is island-based. A collision/force/impulse wakes the impacted island. A sleeping island may be skipped for integration but remains queryable and collision-active according to the chosen sleeping policy.

Simulation natural completion when:
- All dynamic bodies in the relevant simulation scope are asleep or otherwise physically settled.
- No pending scheduled impulse/force operation that will wake them.
- No unresolved collision/CCD event.
- No active kinematic source that can affect the dynamic scope.

Terminal reasons:
- `natural-rest`
- `kinematic-complete`
- `cancelled`
- `watchdog-exceeded`
- `collision-event-limit`
- `simulation-fault`
- `unsupported-physics`

Safety limits never masquerade as natural completion.

## 9. Determinism and replay

Determinism contract requires:
- Fixed timestep.
- Stable body/pair/contact/event ordering.
- Stable solver configuration.
- Seeded randomness; no unseeded randomness in authoritative simulation.
- Explicit physics version, schema version and config fingerprint.
- Replay input log contains body creation, forces, impulses, kinematic keys and commands.
- Replay outputs include periodic state hash and final hash.
- No wall-clock dependency in simulation.

Exact bitwise determinism across CPU architectures is not promised in the first release unless math implementation and floating-point behavior are controlled. Initial promise: deterministic replay on the same supported runtime/platform/config; cross-platform determinism is a later gate.

## 10. Simulation output/protocol v3

Every simulation output:

```json
{
  "type": "simulation.completed",
  "protocolVersion": 3,
  "simulationId": "sim-...",
  "physicsVersion": "3.0.0",
  "dimensionMode": "3d",
  "time": {
    "tStart": 0,
    "tEnd": 2.347,
    "fixedDt": 0.0083333333,
    "ticks": 282
  },
  "completion": {
    "status": "completed",
    "reason": "natural-rest"
  },
  "bodies": [],
  events: [],
  diagnostics: {}
}
```

`bodies[]` includes final transform (position x/y/z and quaternion r), linear/angular velocity, awake state and optional trajectory segments. Events use simulation `t`, not wall-clock timestamps.

Presentation ACK:
```json
{
  "type": "presentation.ack",
  "simulationId": "sim-...",
  outputVersion": 3,
  status": "presented"
}
```

ACK confirms presentation consumption/recovery. It cannot commit/rollback physics or change natural-completion status.

## 11. Transactional Engine initialization

Flow:
1. Load source and validate schema in isolated staging context.
2. Build runtime/modules/state without mutating live runtime.
3. Validate dependencies and entry scene.
4. Run staging-safe initialization hooks.
5. Enter entry scene in staging.
6. Prepare commit and validate final staging snapshot.
7. Atomic swap live runtime pointer/state.
8. Dispose old runtime after commit.
9. On any failure before swap, dispose staging and keep live runtime unchanged.

Hooks are classified:
- Pure initialization: allowed in staging.
- Reversible local effect: staging with rollback.
- Idempotent external operation: through durable operation adapter with key.
- Irreversible external effect: commit phase only or explicit outbox workflow.

Required fault-injection tests: load error, validation error, module error, init hook failure, entry scene failure, transition failure, staging disposal failure, commit failure.

## 12. Schema enforcement and version policy

CI must validate every live producer/consumer:
- Scenario loader -> scenario schema.
- Snapshot producer -> snapshot schema.
- Command dispatch -> command schema.
- ACK producer -> ACK schema.
- Event publisher -> event schema.
- Simulation output -> simulation v3 schema.
- Sprite adapter output -> Sprite motion v3 schema.
- Save envelope -> save schema.

Version domains are independently explicit:
- `engineVersion`
- `protocolVersion`
- `physicsVersion`
- `scenarioVersion`
- `saveVersion`
- `trajectoryVersion`

Policy:
- Breaking contract change increments its own version.
- Migrations are pure/transactional and chain registered versions.
- Unknown future version fails safely.
- Migration failure leaves source save untouched.
- Save migrations produce a new validated envelope.
- No module may silently bump global version independently.

## 13. Durable idempotency

Define operation classes and guarantees:
- In-memory dedupe: only within process lifetime.
- Durable operation ledger: recovery/replay dedupe across process restart.
- External provider idempotency: required for duplicate-proof external side effects.

Do not promise exactly-once external side effect unless external adapter and transaction boundary support it. Durable ledger uses stable operation ID/key, append-only or transactional storage, explicit completion marker and corruption recovery policy. Default policy should be selected based on deployment (single-process local engine vs service); do not claim durable default until persistence backend is mandatory/configured and its failure mode is tested.

## 14. Diagnostics and benchmarks

Failure snapshot includes:
- Scenario/runtime IDs and versions.
- Seed, dimension mode, timestep and solver config.
- Input commands/forces/impulses.
- Body states and transforms (x,y,z,r).
- Contact manifolds and TOI intervals.
- Collision/event ordering.
- Energy ledger and residual.
- Profiler counters.
- Completion/fault reason.
- Replay fingerprint and checkpoint hash.

Benchmarks:
- Sparse 3D bodies.
- Dense clusters.
- Stacked bodies.
- Collision chains.
- High-speed CCD.
- Shape pair matrix.
- Sleeping island workload.
- Mixed 2D constrained and 3D worlds.
- Long-duration determinism/replay.

Benchmark labels must distinguish broadphase stress, solver stress and real collision workloads.

## 15. Acceptance tests

### Core
- Transactional init failure preserves live runtime identity/state/scene/queues.
- Protocol schema test covers every command/event/snapshot/ACK producer.
- Restore remains transactional and process-style restart tested.
- Durable ledger replay tests include truncation and kill/restart windows.

### Physics correctness
- Force integration: analytic comparisons where applicable.
- Impulse: `delta-v = J/m` for translational cases.
- Angular impulse: angular response matches inertia tensor.
- Collision symmetry and stable ordering.
- Momentum conservation in isolated elastic collisions within tolerance.
- Dissipative collisions do not unexplainedly increase energy.
- Static friction holds below threshold.
- Dynamic friction decelerates without velocity sign overshoot.
- Damping monotonic energy reduction.
- Rotation/quaternion normalization.
- No NaN/Infinity.
- CCD supported exact cases and bounded approximation metadata.
- Unknown/uncertain CCD never silently no-hit.

### Natural completion
- Sliding body stops from continuous friction and reports `natural-rest`.
- Rolling/rotating body settles according to configured resistance/sleep model.
- Collision chain propagates and settles all islands.
- Scheduled future impulse prevents premature completion.
- Sleeping island wakes on force, impulse, collision or kinematic interaction.
- Watchdog returns `watchdog-exceeded`, not success.

### Dimensional
- 2D profile constrains z/vz and out-of-plane angular components.
- 3D free translation and rotation.
- Quaternion input normalization/rejection policy.
- Shape transforms and rotated OBB/capsule/polygon cases.
- Cross-profile adapter tests for equivalent planar cases.

### Determinism
- Same seed/config/input yields same state hashes on supported runtime.
- Event ordering stable under insertion-order perturbation.
- Replay across save/checkpoint boundary.
- No wall-clock dependency.

## 16. Migration plan — one coherent program, staged implementation

### Stage A — Contract and Core safety
- Freeze this architecture baseline as ADR/spec.
- Transactional init.
- Protocol schema contract matrix.
- Explicit version policy.
- Add baseline regression tests before changing physics.

### Stage B — 3D math/body foundation
- Vec3, quaternion, matrix/inertia, transforms.
- Body contract and 2D-constrained profile.
- Fixed-step world/clock.
- Determinism metadata/replay format.

### Stage C — Force integration and state lifecycle
- Force/torque registry.
- Semi-implicit integration.
- Dynamic/kinematic/sensor/static.
- Impulse scheduling.
- Sleep/wake/islands.
- Natural completion and watchdog semantics.

### Stage D — Unified geometry/collision/solver
- Sphere parity first.
- 3D broadphase.
- Sphere/sphere, sphere/plane, sphere/box.
- OBB/box, capsule, convex hull, compound in sequence.
- Contact manifolds and angular solver.
- CCD exact/bounded methods and explicit uncertain results.

### Stage E — Continuous friction and energy
- Static/dynamic friction.
- Rolling resistance.
- Damping/drag.
- Energy ledger and invariant tests.
- Collision chain/natural-stop acceptance.

### Stage F — Sprite protocol v3 and adapter
- Sprite descriptors map to 3D body/kinematic/impulse/force contract.
- Output carries x/y/z/r/t, final velocity, events, diagnostics, completion reason.
- Presentation adapter consumes snapshots/trajectory and ACKs only presentation.

### Stage G — Recovery, migration and deprecation
- Versioned physics checkpoints.
- Save migration chain.
- Durable operation policy.
- Failure snapshot/replay.
- Compare legacy/v3 outputs for supported cases.
- Remove old authoritative fixed-horizon coordinator only after parity/acceptance gates.

No stage should be considered complete solely because tests are green; acceptance invariants must pass and benchmark baselines be recorded.

## 17. ADR summary

- ADR-001: Physics World is authoritative.
- ADR-002: 3D-native state; 2D is constrained profile.
- ADR-003: Transform = x/y/z + quaternion r; simulation time t explicit.
- ADR-004: Fixed timestep; unbounded duration subject to safety watchdog.
- ADR-005: Natural completion is state-driven.
- ADR-006: One unified geometry/contact/solver pipeline.
- ADR-007: Friction, damping and rolling resistance are separate models.
- ADR-008: Deterministic ordering and replay are contracts.
- ADR-009: Presentation ACK never decides physics completion.
- ADR-010: Engine init and externally visible commit are transactional.
- ADR-011: Schemas are executable CI contracts.
- ADR-012: Version domains and migration policy are explicit.
- ADR-013: External exactly-once side effects are not promised without provider/transaction support.

## 18. Definition of Done

Engine vNext is accepted only when:
- 3D-native canonical state and explicit time are implemented.
- 2D constrained profile passes dimensional invariants.
- Dynamic physics has natural completion without authored horizon.
- Continuous friction/damping and energy diagnostics are implemented and tested.
- Unified solver handles angular state and supported shape matrix.
- CCD exposes exact/bounded/uncertain semantics.
- Collision chain and island sleeping tests pass.
- Deterministic replay is stable on supported runtime.
- Transactional init passes all fault-injection cases.
- All protocol producer/consumer schema contract tests pass in CI.
- Save/recovery and version/migration tests pass.
- Benchmarks cover sparse, dense, real collision, CCD, sleeping and replay workloads.
- Legacy coordinator is removed only after parity gates.

## Final recommendation

Treat this as one architecture program with staged delivery, not several incompatible redesigns. Start by landing Core transactional init and schema enforcement, then build the 3D-native simulation contract and world behind an adapter. Keep the old Sprite coordinator available for regression comparison, but never let it remain a second authoritative physics implementation after the migration gate. The first implementation should be 3D-native even if the first shipped workload is 2D; all transforms, rotations and times are present from day one.
