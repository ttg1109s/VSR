# Sprite Motion and Physics Modules

The Sprite implementation is intentionally flat. Motion, collision, recovery, and 3D physics files live directly in `engine/modules/sprite/`; `index.js` is the public export surface.

## Phase 2 — Canonical PoseTrajectory

`PoseTrajectory` is the sole source of sampled location, rotation, scale, origin and supported derivatives. Initial pose uses the required object contract:

```js
position: {
  location: [0, 0, 0],
  transform: {
    rotation: [0, 0, 0],       // Euler degrees OR quaternion [w,x,y,z]
    scale: [1, 1, 1],         // per-axis scale
    origin: [0, 0, 0]         // local origin offset
  }
}
```

Transform keys require `time`, `rotation`, `scale` and `origin`. Rotation is either Euler Vec3 or quaternion; scale and origin are Vec3. There are no scalar-rotation, uniform-scale, named-origin, tuple-transform, `rotate` alias, or alternate quaternion-key compatibility forms.

Position, scale and Euler rotation use cubic Hermite interpolation. Quaternion rotation uses normalized quaternion interpolation and supports angular-velocity tangents. `positionVelocity`, `angularVelocity` and `scaleRate` key tangents are consumed by the canonical trajectory. `retarget(time,...)` anchors at the sampled pose and preserves supported derivatives by default.

## Phase 3 — PhysicalStateSampler and authoritative fixed-step integration

Each physics-enabled Sprite receives one canonical `poseTrajectory` and one `physicalStateSampler`. The sampler derives scaled collider geometry, mass, inverse mass, principal inertia and inverse inertia from one pose timestamp. `RigidBodyWorld3D.syncPhysicalState(time)` synchronizes the initial state; the world samples at both fixed-step boundaries. Kinematic/scripted bodies receive trajectory pose and derivatives. Dynamic body location/orientation remain solver-owned while scale/origin-driven physical properties are sampled at the same timestamp.

World configuration is authored only at the world level. The normalizer no longer adopts or reconciles world settings from per-Sprite physics objects. Per-body orientation is authored only in canonical `position.transform.rotation`; the duplicate `physics.orientation` field is removed.

A non-uniformly scaled sphere uses a conservative enclosing sphere for collision while principal moments are derived from ellipsoid radii. This avoids false negatives from undersized geometry but can produce false-positive contacts. Box scale is baked into half-extents; collider offsets are scaled with pose scale; plane normal and offset are transformed together.

## Runtime boundaries

Phase 6 tensor inertia and iterative contact solving are now integrated. Dynamic bodies retain principal local inertia and compute world inverse inertia from current orientation; torque and contact impulses update angular velocity through the tensor. Contact manifolds are resolved in deterministic body-pair order with configurable sequential velocity iterations and position correction iterations. Restitution is thresholded for stability and friction impulses are accumulated and clamped to the Coulomb cone. The runtime now performs a global earliest-impact continuation loop within the fixed timestep, refreshes swept broadphase candidates after impacts, resolves subsequent confirmed impacts, and records impact-budget exhaustion/indeterminate CCD diagnostics. The loop has a deterministic finite impact budget to protect against pathological zero-time loops. This phase does not implement a general ellipsoid narrowphase, complete shape-pair matrix or shape-aware CCD.

Checkpoint serialization still stores sampled body values, not executable trajectory/sampler definitions; deterministic persistence/replay remains Phase 7.


## Phase 4 — Conservative swept broadphase

The 3D world builds deterministic candidate pairs from swept bounding-sphere AABBs. Sphere, ellipsoid and box geometry use conservative radius bounds including collider offsets; movement sweeps center from current position through the fixed-step predicted endpoint. Planes are unbounded and always candidates against collision-enabled bodies. Unknown collider types and sampled/animated geometry use all-pairs fallback. Large cell spans bypass bucket expansion and fall back to pairing. Candidate pairs are AABB-confirmed where bounds exist and integrated into both CCD and discrete collision passes. This conservative filter does not add narrowphase shape pairs or alter unsupported narrowphase outcomes.


## Phase 5 — Shape-aware narrowphase contract

The supported narrowphase pair matrix is explicit: sphere-sphere, sphere-box, box-box (OBB SAT), sphere-plane, box-plane, sphere-ellipsoid and ellipsoid-plane. Box geometry is orientation-aware; OBB-OBB uses the 15-axis SAT (3 axes from each box plus 9 edge-cross axes) and computes a support-feature contact point. Box-plane computes projected OBB extent against the plane normal. Supported pairs return either confirmed contact or confirmed no-contact. Unsupported pairs (including ellipsoid-ellipsoid and ellipsoid-box) return an explicit `indeterminate` contract through `narrowphase3D`; the world emits an `narrowphase-indeterminate` event and diagnostic count rather than treating unsupported geometry as authoritative separation.

**Phase 5 boundary:** pair-specific CCD/conservative advancement is not complete. The existing analytic swept-sphere CCD remains the only CCD path; other supported narrowphase pairs are currently discrete. This is an implementation slice, not Phase 5 completion.


## Phase 6 — RigidBodyWorld3D solver implementation

The world now uses body-local principal inertia tensors and orientation-derived world inverse tensors for torque and contact response. The Phase 6 solver module provides deterministic sequential impulse iterations across the discovered contact set, accumulated normal and friction impulses, restitution thresholding, Coulomb friction bounds, and iterative penetration correction. Solver iteration counts are configurable on the world. Static and kinematic bodies contribute zero inverse inertia; dynamic bodies use sampled principal moments when PhysicalStateSampler is present. CCD currently resolves at most one handled impact per body per fixed step, so multi-impact continuation remains a constrained boundary.


### Multi-impact CCD continuation

Within one authoritative fixed step, CCD now advances the world to the earliest confirmed impact, resolves its normal impulse, refreshes conservative swept broadphase candidates for the remaining time, and repeats until no further confirmed impact exists or a deterministic finite impact budget is reached. CCD collision events include an impact index and diagnostics report total impact count and whether the budget was exhausted. Indeterminate pairs are surfaced as events and deduplicated by pair/reason during the continuation loop. This implementation is source-complete; test execution remains intentionally out of scope.
