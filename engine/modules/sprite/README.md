# Sprite Motion / Unified Physics

## Runtime compatibility

The existing authoritative Sprite trajectory coordinator remains **protocol v2** by default. It preserves the current client presentation/ACK contract and event-time circle/sphere coordinator. It is not yet wired to execute authoritative motions through the new 3D World.

## Unified 3D-native physics

`physics3d/RigidBodyWorld3D.js` is a shared physics world. `dimension: '3D'` permits XYZ and normalized quaternion rotation. `dimension: '2D'` constrains the same world to plane `XY`, `XZ`, or `YZ`; `planeOffset` supports a non-zero plane, and `dimensionPolicy` chooses `project` or `reject` for invalid out-of-plane vectors.

```js
import { RigidBodyWorld3D } from './index.js';
const world = new RigidBodyWorld3D({ dimension: '2D', plane: 'XY', fixedDt: 1/120, gravity: [0,-9.81,0] });
world.addBody({ id:'ball', position:[0,2,0], velocity:[1,0,0], radius:.5 });
world.step();
```

3D runtime supports dynamic/static/kinematic/sensor bodies; force, torque, impulse and timed idempotent impulse; fixed time; sleep/wake; checkpoint/restore; energy diagnostics; sphere, AABB box and plane collision queries/responses; analytic sphere CCD for flagged bodies (one impact per body per fixed step). Box colliders are axis-aligned; scalar inertia is approximate.

## 2D compatibility

`physics3d/DimensionProfile.js` constrains all dimensional state and provides `legacy2DTo3D()` and `transform3DToLegacy2D()` adapters. Existing `x/y/angle` style data can be mapped into XYZ/quaternion. This adapter does not itself switch the legacy Sprite coordinator to the 3D World.

## Protocol v3 contract

`physics3d/ProtocolV3.js` exports a v3 serializer, validator and v2 trajectory adapter. Schema is `physics3d/protocol-v3.schema.json`. Protocol v3 represents XYZ, quaternion, linear/angular velocity, explicit simulation time, dimension, completion, events and diagnostics. It is currently a standalone contract; v2 remains the published default until end-to-end migration and parity gates are completed.

## Existing v2 authority

- Engine generates initial trajectory, collision events, response, post-impact segments and final positions.
- Client renders/interpolates and ACKs; it cannot report authoritative impact.
- Final affected-body positions commit after validated presentation ACK.
- End effects run only after valid ACK.
- Collision transitions commit all affected bodies together.

## 2D modules and diagnostics

`collider.js` and `solver.js` provide standalone 2D circle/box/convex/capsule/compound geometry and a 2D angular contact solver. `recovery.js` provides an fsync-backed operation ledger for integration-side effects. The authoritative v2 coordinator remains circle/sphere based.

The exact feature boundaries and verification are in `docs-sprite-motion/implementation-status.md` and `docs-sprite-motion/one-pass-upgrade-report.md`. Benchmarks: `tests/sprite-physics/benchmark.js` (legacy Sprite) and `benchmark3d.js` (new physics world; all-pairs narrowphase, informational).

## Post-impact trajectory solving (v2)

Post-impact trajectory endpoints are derived from the configured continuous dynamics. The v2 coordinator no longer uses `horizon`, `maxPhysicsDuration`, or `postImpactDeceleration` to determine endpoints. With zero external acceleration and positive `linearDamping`, the solver analytically integrates exponential drag (`v(t)=v0*exp(-k*t)`) and uses `sleepLinearThreshold` as the natural-equilibrium tolerance. The same damping parameter is serialized so the client samples the solved exponential trajectory exactly, rather than approximating it with constant acceleration. If damping is absent/zero or external acceleration prevents equilibrium, the segment is explicitly marked `non-terminating-dynamics`; it is not assigned a fabricated physical endpoint.
