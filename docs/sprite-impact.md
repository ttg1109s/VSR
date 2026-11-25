# Sprite Motion Impact

`impact` is configured inside `sprite.<id>.motion` and is active only while the Sprite motion is executing.

```json
{
  "motion": {
    "enable": true,
    "duration": 1000,
    "path": { "type": "bezier", "points": [] },
    "easing": "ease_in_out",
    "impact": { "enable": true, "physics": false },
    "effect": { "start": [], "end": [] }
  }
}
```

- `impact.enable`: accepts collision events while this motion is active. Defaults to `false`.
- `impact.physics`: requests physics response when a collision is accepted. Only meaningful when `enable` is true. Defaults to `false`.
- Collision targets must be on the same runtime layer as the moving Sprite.
- With `physics: false`, the presentation host is expected to stop the moving Sprite at contact boundaries without overlap.
- With `physics: true`, the presentation host is expected to perform a physics response. The engine marks the motion as ended at the impact and emits a collision event; continued physics motion is host-owned.
- `motion.effect.start` runs when the motion descriptor is initiated; `motion.effect.end` runs on completion or accepted impact.
- `sprite.motion.impact` is a host-to-engine command. The host supplies the moving Sprite, target Sprite, motion ID and contact data. The engine validates the motion's impact configuration and same-layer condition, deduplicates by motion ID, emits `sprite.impact`, and executes the motion end effect.
- `type: "impact"` requirements inspect the latest collision record for a Sprite. `property: "target"` compares the other Sprite ID and `property: "physics"` compares the physics-response flag.

The engine does not infer rendered collider dimensions from image URLs. Collision geometry and swept collision detection are implemented by the presentation host, which should call `JsonClient.reportSpriteImpact()` when it confirms a same-layer contact. The engine-side command is a validation/event/effect boundary, not a collision solver.
