# 3D-native / constrained-2D Physics World

The `RigidBodyWorld3D` runtime is the shared physics core. Select `dimension: '3D'` for unrestricted XYZ/quaternion state or `dimension: '2D'` with plane `XY`, `XZ`, or `YZ` to constrain the same core. 2D defaults to projection of out-of-plane state (`dimensionPolicy: 'project'`); `reject` throws on invalid input vectors.

```js
import { RigidBodyWorld3D } from '../index.js';
const world = new RigidBodyWorld3D({ dimension: '2D', plane: 'XY', fixedDt: 1/120, gravity: [0,-9.81,0] });
world.addBody({ id:'ball', position:[0,2,0], velocity:[1,0,0], radius:.5 });
world.step();
```

## Implemented in this upgrade
- XYZ positions, normalized quaternion orientation, explicit simulation time/tick, fixed timestep.
- Dynamic/static/kinematic/sensor bodies; force, torque, impulse, scheduled impulse with operation IDs.
- Sphere, axis-aligned box, and plane narrowphase queries; sphere-box, box-box, sphere-plane, sphere-sphere contacts.
- Sphere CCD for flagged bodies: analytic swept TOI, one supported CCD impact per body per fixed step. Other shape pairs remain discrete.
- Normal impulse, approximate scalar inertia, friction, positional correction, sleep, energy diagnostics, checkpoint/restore.
- 2D XY/XZ/YZ constrained profiles and legacy 2D transform adapter.
- Protocol v3 serializer/validator and JSON schema. `SpriteSimulationCoordinator3D` executes fixed-step worlds to natural-rest or watchdog failure and emits v3 snapshots/events/trajectory samples.

## Explicit limits
- Box collision is axis-aligned; orientation does not rotate box collider geometry (OBB is not implemented).
- CCD is sphere-sphere only, one event per body per fixed step. CCD against box/plane and multiple-impact CCD chains are not implemented.
- Scalar inverse inertia is an approximation for box bodies. Full tensor/world-space inertia and iterative multi-contact island solver remain future work.
- Convex hull/GJK/EPA, capsule, compound and dynamic concave mesh colliders are not supported by this 3D runtime.
- Protocol v3 world coordinator is available, but the legacy `engine/modules/Sprite.js` motion coordinator still publishes v2 for compatibility and is not yet migrated to authoritative 3D-world execution.
- No cross-platform bitwise determinism claim.
