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

The current world still approximates principal inertia by a scalar average in contact response. Full tensor inertia and solver integration remain Phase 6. This phase does not implement a general ellipsoid narrowphase, complete shape-pair matrix or shape-aware CCD.

Checkpoint serialization still stores sampled body values, not executable trajectory/sampler definitions; deterministic persistence/replay remains Phase 7.
