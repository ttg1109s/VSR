# One-pass 3D-native + constrained-2D upgrade report

## Implemented source changes
- Shared `RigidBodyWorld3D` with selectable `dimension: 3D|2D`, plane `XY|XZ|YZ`, offset, projection/rejection policy.
- 2D dimensional invariants constrain position, velocity, force, angular state, torque, quaternion, and collision-solved body state.
- Legacy 2D transform adapter (`x/y/z/angle/vx/vy/angularVelocity`) to XYZ/quaternion and back.
- 3D collider API: sphere, axis-aligned box, plane; narrowphase sphere-sphere, sphere-box, box-box, sphere-plane.
- Explicit sphere CCD: analytic swept TOI, one CCD impact per body per fixed step.
- Shape-aware 3D world collision contact, angular impulse terms with scalar approximate inertia, friction, correction, sleep and energy diagnostics.
- Checkpoint v2 includes dimension profile and collider state; restore accepts v1 checkpoint for compatibility.
- Protocol v3 serializer, validator, adapter contract, JSON schema; executable 3D simulation coordinator runs to natural-rest or watchdog failure and emits state/events/trajectory samples. Legacy Sprite protocol v2 is retained.
- 3D benchmark entrypoint.

## Verification
- `npm test`: 370 passed, 0 failed.
- `npm run test:stress`: 76 passed, 0 failed.
- Existing Sprite benchmark: completed all six workloads.
- New 3D benchmark (120 ticks, 100 bodies): sphere sparse 3.5222 ms/tick; box sparse 3.5624; sphere dense 3.9196; constrained 2D 3.4590. Informational; current 3D world uses deterministic all-pairs pair checks and no accelerated broadphase.

## Not yet completed (do not represent as complete)
- End-to-end migration of `engine/modules/Sprite.js` authoritative coordinator and presentation ACK/recovery to protocol v3 / 3D World.
- OBB boxes, capsules, convex hull/GJK/EPA, compound, mesh colliders.
- Full tensor/world inertia, iterative manifold solver, islands.
- CCD for box/plane, multiple impacts per body per fixed step, CCD chains.
- 3D broadphase acceleration, cross-platform deterministic guarantee.
- Transactional engine-init redesign from the architecture specification.

## Integration decision
The source now provides a tested shared 3D-native world with constrained 2D mode and migration adapters, but the existing Sprite protocol coordinator remains v2 by default to avoid breaking current clients. The next compatibility gate is an opt-in protocol v3 end-to-end path and parity tests before changing default output.
