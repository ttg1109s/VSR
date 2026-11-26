# Sprite Physics Schema Consolidation

## Canonical contract

All physical properties are authored under `sprite[id].physics`. `sprite[id].motion` describes the scripted trajectory and its collision/impact trigger, but it no longer owns a nested `physics` object.

```json
{
  "sprite": {
    "ball": {
      "action": "inspect_ball",
      "layer": 1,
      "state": { "idle": "ball.png" },
      "position": [0, 0, 0],
      "collision": { "enable": true, "radius": 10 },
      "physics": {
        "mass": 1,
        "restitution": 0.5,
        "friction": 0,
        "gravity": [0, -9.8, 0],
        "horizon": 2
      },
      "motion": {
        "enable": true,
        "duration": 1000,
        "path": { "point": [[], "geometry-preserving"] },
        "easing": "linear",
        "impact": { "enable": true, "physics": true },
        "effect": { "start": [], "end": [] }
      }
    }
  }
}
```

## Property meaning

- `physics.mass`: body mass; runtime defaults to 1.
- `physics.restitution`: collision restitution; runtime defaults to 0.5.
- `physics.friction`: collision friction; runtime defaults to 0.
- `physics.gravity`: gravity vector used by the Sprite impact simulation; runtime defaults to `[0,0,0]`.
- `physics.horizon`: post-impact simulation horizon in seconds; runtime defaults to 2.
- `motion.impact.enable`: enables collision detection for the motion owner.
- `motion.impact.physics`: enables collision response when impact detection is enabled.

## Compatibility

Scenario validation and normalization migrate the former `motion.physics` object into `sprite.physics` and remove it from `motion`. If the same property is present in both locations, canonical `sprite.physics` wins; legacy values only fill properties absent from the canonical object. This migration is a compatibility path, not the authoring contract. New scenarios must place physics values in `sprite.physics`.

## Unified 2D/3D canonical extension

The scenario schema now supports `sprite.physics.dimension` (`2D`/`3D`), `plane` (`XY`/`XZ`/`YZ`), `planeOffset`, `dimensionPolicy` (`project`/`reject`), `bodyType`, initial `velocity`, `angularVelocity`, `orientation`, damping, CCD, timestep and sleep thresholds. `sprite.collision` now declares `shape` (`sphere`/`box`/`plane`), `halfExtents`, `offset`, `normal`, plane offset and CCD while preserving the legacy `radius` field.

`SpritePhysicsConfig.js` normalizes canonical Sprite scenario entries into RigidBodyWorld3D body specs. `normalizeScenarioSpritePhysics` rejects mixed dimension profiles, timestep/sleep settings and per-Sprite gravity in a single world instead of silently dropping them. `SpriteSimulationCoordinator3D.fromScenario()` and `.runScenario()` execute those normalized definitions.

Protocol v3 is available as `engine/protocol/sprite-simulation-v3.schema.json`, and `JsonClient` now validates and emits `sprite.simulation.v3` events for `presentation.sprite.simulation.v3` or `presentation.sprite.trajectory.v3`. The Engine API exposes `spritePhysics.runScenario(spriteDefinitions, options)` which publishes the authoritative v3 payload. Existing scripted-motion protocol v2 remains backward-compatible and is not silently replaced.

Runtime limitations remain explicit: box collision is currently AABB (not OBB), the world is homogeneous (one dimension profile/gravity/timestep per simulation), CCD is limited to flagged sphere-sphere pairs, and the new API is opt-in rather than automatically replacing legacy scripted Sprite motion.
