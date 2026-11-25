# Sprite System

Sprite definitions live in the root `sprite` namespace. A Sprite references a global Action and has named visual states, layer, initial position, transform, and optional motion configuration.

## Position

Runtime position is always a finite `[x, y, z]` vector. `set/sprite/position` accepts 1–3 axis values; `null` means keep the current axis. Omitted axes in a shorter array are also kept. Negative values are ordinary coordinates. `null` is only valid in partial updates and motion waypoint definitions, never in resolved runtime positions.

```json
{ "type": "set", "subtype": "sprite", "target": "door", "property": "position", "value": [null, 300, null] }
```

## Transform

```json
"transform": { "scale": 1, "rotate": 0 }
```

`scale` must be finite and greater than zero. `rotate` is finite degrees. Effects can update `scale`, `rotate`, or a partial `transform` object.

## Motion

```json
"motion": {
  "enable": true,
  "duration": 1000,
  "type": "linear",
  "easing": "ease_in_out",
  "step": []
}
```

- `enable`: if false, position is changed immediately and no motion event is emitted.
- `duration`: total motion duration in milliseconds.
- `type`: path geometry identifier. Current schema accepts `linear`, `sin_native`, and `sin_positive`. The Engine passes the identifier through; it does not invent the curve formulas for non-linear geometry.
- `easing`: independent normalized time function: `linear`, `ease_in`, `ease_out`, `ease_in_out`, `sin_in`, `sin_out`, `sin_in_out`, or `step`.
- `step`: explicit intermediate waypoint objects with named axes; `null` means retain the preceding waypoint's axis. Each waypoint must specify at least one axis.

Timeline: with three explicit waypoint objects, the path has 5 nodes: index 0 start, indices 1–3 waypoints, index 4 effect target. With `step: []`, an implicit midpoint is used, giving the 0 → 1 → 2 timeline (start, midpoint, target).

Duration is the total for the entire path. Easing is evaluated over normalized global progress; path geometry is a separate dimension. For linear geometry, `JsonClient.sampleSpriteMotion()` samples the path. Other geometry types are passed to the host renderer as descriptors and must be implemented by that renderer using the exact geometry semantics it owns.

## Protocol

On an enabled position set, the Engine publishes `presentation.sprite.motion` with `spriteId`, `from`, `waypoints`, `to`, `path`, `duration`, geometry `type`, and `easing`. Runtime position immediately stores the logical target. The JSON Client validates the descriptor, emits a dedicated `sprite.motion` event for host presentation code, and also forwards the raw protocol event. If a new motion interrupts an active animation, the host renderer should start from the currently rendered position instead of blindly resetting to the Engine's logical `from` position.

## Runtime state / save restore

Runtime state stores logical position and transform. Motion configuration remains scenario-definition data and is not mutable runtime state. Restore supports older Sprite saves lacking transform/motion by applying scenario defaults.
