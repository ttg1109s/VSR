# Sprite Motion and Unified Physics

Sprite is organized by domain. `index.js` is the public facade only.

- `core/`: authoritative simulation and lifecycle authority.
- `motion/`: trajectories, analytical motion, deterministic replay.
- `collision/`: detection, 2D geometry and 3D-native geometry.
- `physics/`: shared configuration and world; 2D response/solver profile; 3D fixed-step world and coordinator.
- `recovery/`: durable idempotent operation ledger.
- `math/`: shared vector primitives.

The 3D-native world supports a constrained 2D dimension profile (XY/XZ/YZ planes) and full 3D. 2D-specific trajectory/collision behavior and 3D-native quaternion, force/torque, angular dynamics, colliders and fixed-step world are retained as distinct capabilities.

Protocol contract and serialization remain owned by `engine/protocol/JsonProtocol.js` and `engine/protocol/protocol.schema.json`. Scenario configuration ownership is canonicalized by the scenario schema/normalizer: `config.physicsWorld`, `sprite.physics`, and `sprite.collision`.

Debug-only diagnostics timeline/profiling/failure-snapshot helpers have been removed. Deterministic replay remains in `motion/replay.js`; durable operation recovery remains in `recovery/ledger.js`.
