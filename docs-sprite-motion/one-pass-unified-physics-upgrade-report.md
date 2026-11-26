# Unified Sprite Physics 2D/3D — One-Pass Upgrade Report

## Implemented in this pass

- Scenario schema: added canonical dimensional profile, body type, initial linear/angular velocity, quaternion orientation, damping, CCD, timestep/sleep controls and collider shape/geometry fields under `sprite.physics` and `sprite.collision`.
- Engine: added `SpritePhysicsConfig.js` normalizer and scenario-to-world adapter. It rejects mixed world dimension profiles, gravity and shared timestep/sleep configuration rather than silently discarding differences.
- Physics runtime: `SpriteSimulationCoordinator3D.fromScenario()` and `runScenario()` build and execute authoritative v3 simulations directly from scenario Sprite definitions.
- Engine API: `engine.api.spritePhysics.runScenario(spriteDefinitions, options)` runs the normalized simulation and publishes `presentation.sprite.simulation.v3`.
- Protocol: v3 schema copied to canonical `engine/protocol/sprite-simulation-v3.schema.json`; protocol exports include validator/serializer/adapter and canonical config normalization.
- JsonClient: validates v3 simulation events and emits `sprite.simulation.v3`; invalid v3 events emit `sprite.simulation.invalid`.
- Documentation and tests updated.

## Compatibility

Legacy scripted Sprite motion protocol v2 remains active and unchanged. This pass adds an explicit authoritative v3 physics execution API; it does not silently replace the existing v2 motion coordinator or automatically route every legacy motion command through the 3D world.

## Runtime constraints

- One simulation world uses one dimension profile, gravity vector, fixed timestep and sleep configuration; mixed configurations are rejected.
- Box collider implementation is AABB, not oriented box.
- CCD remains limited to flagged sphere-sphere pairs.
- Plane collider interactions are currently limited by the existing collider solver's supported pair set.
- 3D physics execution is opt-in through the new API.

## Verification

`npm test` was run after the changes. The report records the final test count and status from the verification run.

Verification result: see full test output; npm test exit status is stored in the completion log.

Final test result: **379 passed, 0 failed** (`npm test`, exit status 0).

## Follow-up: Simplified authoring defaults

- `sprite.physics.enable` is now opt-in and defaults to `false`.
- Loader schema validation fills canonical physics defaults when the `physics` object exists.
- Runtime defaults: 2D/XY/project, dynamic, mass 1, restitution 0.2, friction 0.5, gravity `[0,-9.81,0]`, zero initial velocities, identity orientation, fixed timestep 1/120, CCD disabled.
- Physics scenario normalization skips sprites whose physics is not explicitly enabled.
- Collision is disabled when no `collision` object is declared; when declared, its schema default `enable: true` applies unless explicitly disabled.
- Regression suite: 381 tests passed.
