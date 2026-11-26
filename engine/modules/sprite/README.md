# Sprite Motion and Physics Modules

The Sprite implementation is intentionally flat. Motion, collision, recovery, and 3D physics files live directly in `engine/modules/sprite/`; `index.js` is the public export surface.

## Phase 2 — Canonical PoseTrajectory

`PoseTrajectory` is the source of sampled position, rotation, scale, origin, and supported derivatives. Position trajectories expose `sample(time)` and `velocity(time)`. Transform keys support direct scalar/Euler rotation, quaternion interpolation, scale and origin. Position, scale, and direct scalar/Euler rotation use cubic Hermite interpolation; optional endpoint `positionVelocity`, `angularVelocity` and `scaleRate` fields constrain the supported tangent components. `retarget(time, ...)` anchors at the sampled pose and preserves position, supported angular and scale derivatives by default.

Quaternion rotation uses normalized shortest-path interpolation/slerp. Prescribed angular-velocity Hermite constraints are deliberately rejected for quaternion keys rather than silently claiming derivative continuity that this interpolation does not implement. Quaternion angular-rate sampling reports the segment's relative axis-angle rate. A quaternion retarget that requires exact angular-velocity continuity must be expressed using direct Euler/scalar channels or use a future tangent-space quaternion spline.

## Phase 3 — PhysicalStateSampler and authoritative fixed-step integration

Each normalized physics-enabled Sprite receives one canonical `poseTrajectory` and one `physicalStateSampler`. The sampler derives scaled collider geometry, mass, inverse mass, principal inertia, and inverse inertia from one pose timestamp. `RigidBodyWorld3D.syncPhysicalState(time)` synchronizes the initial state; the world samples again at the start of each fixed step. Kinematic/scripted bodies receive trajectory pose and derivatives at each step boundary. Dynamic body position and orientation remain solver-owned; their sampled physical state keeps the solver's current position while geometry, mass and inertia are refreshed at the same timestamp.

A non-uniformly scaled sphere uses a conservative enclosing sphere for collision, while the sampler computes principal moments from the corresponding ellipsoid radii. This cannot miss a collision due to an undersized shape, but can produce false-positive contacts. The approximation and exact ellipsoid radii are carried in sampled geometry metadata. Box scale is baked into half-extents; collider offsets are scaled with pose scale; plane normal and offset are transformed together by the inverse-transpose scale rule.

## Runtime boundaries (not claimed complete by Phases 2/3)

The current world still approximates principal inertia by a scalar average in its contact response. Full tensor inertia, world-space/body-space tensor rotation and solver integration remain Phase 6. This phase does not implement a general ellipsoid narrowphase, full shape-pair matrix, or shape-aware CCD. The existing narrowphase capabilities and limitations remain owned by `collider3d.js`; the conservative sphere representation is used for scaled sphere geometry specifically to avoid an unsupported ellipsoid pair becoming a false no-impact result.

Checkpoint serialization still stores sampled body values, not executable trajectory/sampler closures; deterministic persistence/replay of those definitions remains Phase 7.
