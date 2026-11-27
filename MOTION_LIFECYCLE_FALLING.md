# Authoritative Motion Lifecycle and Falling

## Runtime model

Sprite motion now emits an authoritative `motionLifecycle` alongside the legacy trajectory-v2 presentation descriptor. Lifecycle phase results are assembled and dispatched through `MotionLifecycle`; the lifecycle finalizer is the only runtime boundary that generates the canonical Motion LUT.

Phase types currently emitted by the Sprite motion path:

- `authored-motion`
- `impact-resolution` (when event-time impact resolution occurs)
- `falling` (when enabled in the motion definition)

Phase handoffs preserve simulation time, position, velocity, orientation, angular velocity and scale. The engine checks handoff continuity before lifecycle finalization.

## Falling configuration

The legacy shorthand remains valid:

```json
"falling": true
```

The configurable form is:

```json
"falling": {
  "enable": true,
  "maxDuration": 20,
  "maxTicks": 24000,
  "fixedDt": 0.0083333333,
  "sampleEveryTicks": 1,
  "restLinearThreshold": 0.05,
  "restAngularThreshold": 0.05,
  "restDwell": 0.5,
  "stopWhenResting": true,
  "terminalPolicy": "supported-and-resting",
  "environment": [
    { "id": "ground", "shape": "plane", "normal": [0, 1, 0], "offset": 0 }
  ],
  "world": {
    "gravity": [0, -9.81, 0],
    "dimension": "2D",
    "plane": "XY"
  }
}
```

Environment colliders are registered in the shared physics world. Supported shapes are plane, sphere and box. `terminalPolicy` supports `supported-and-resting`, `simulation-limit`, and `manual`; the latter two run until the configured simulation/safety budget unless a custom phase policy is supplied through the engine API.

## Terminal semantics

- `supported_and_resting`: support and low linear/angular motion persisted for the rest dwell; the solver may legitimately have put the body to sleep and zeroed its velocity.
- `simulation_limit`: configured duration budget reached; velocity is preserved.
- `safety_limit`: fixed-step budget reached; velocity is preserved.
- `authored_policy`, `interrupted`, `cancelled`, `superseded`, and `failed` are distinct lifecycle/phase outcomes in the contract.

Phase completion is not `motion.end`. The lifecycle terminal boundary generates the canonical LUT and commits final position plus `motionState` (velocity, orientation, angular velocity, scale, body/collider/world/contact context and terminal reason) only after presentation ACK.

## Protocol and client

- Lifecycle protocol: `vsr.sprite`, version 4, kind `motion-lifecycle`.
- Canonical Motion LUT: existing version 3.
- Trajectory protocol v2 carries `motionLifecycle`, `motionLUT`, `finalStates`, and participant states.
- JSON clients validate lifecycle payloads and can create a lifecycle player/sample through `createSpriteMotionLifecyclePlayer` and `sampleSpriteMotionLifecycle`.

Schema: `engine/protocol/sprite-motion-lifecycle-v4.schema.json`.

## Tests

New lifecycle/falling tests cover fixed-step rest, simulation-limit velocity preservation, phase handoff continuity, terminal LUT generation, JSON client lifecycle event validation, initial-to-Falling execution, Impact-Resolution-to-Falling continuity, and final authoritative velocity commit.
