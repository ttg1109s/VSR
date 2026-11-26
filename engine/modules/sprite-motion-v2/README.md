# Sprite Motion / Physics v2 — authoritative runtime

Sprite Motion v2 is the only runtime motion protocol. No v1 descriptor, Client-reported impact command, or legacy completion command is supported.

## Authority

- Engine generates initial trajectory, collision events, physics response, post-impact segments, final positions, and active lifecycle state.
- Client is a renderer and may sample/interpolate the supplied trajectory representation. It cannot report authoritative impact or choose physics response.
- Runtime Sprite position remains at its authoritative start/current simulated state while presentation is pending. Final affected-body positions are committed only after a validated ACK.
- End effects run only after a valid presentation ACK.
- A collision is a multi-body state transition. All affected bodies receive current/post-impact state and final commit together.

## Runtime

`AuthoritativeSpriteSimulation` performs event-time pair scanning with subdivision-based continuous collision detection for moving circles/spheres, impulse response, restitution, friction, penetration correction, and collision chains across body pairs. It uses stable body ordering and deterministic collision ordering for a given input snapshot.

The simulation has a configurable horizon and maximum collision event count. Collision geometry is circle/sphere radius only; CCD remains subdivision-based approximation rather than adaptive/exact general geometry.

## Scenario configuration

Sprite-level:

- `collision.enable`, `collision.radius`
- `physics.mass`, `physics.restitution`, `physics.friction`, `physics.gravity`

Motion-level:

- Initial `enable`, `duration`, `path`, `easing`
- `impact.enable`, `impact.physics`
- `physics.horizon`, `physics.restitution`, `physics.friction`, `physics.gravity`
- `effect.start`, `effect.end`

## Protocol

Engine publishes `presentation.sprite.trajectory.v2` with `protocolVersion: 2`, motion and trajectory IDs, timeline, per-body segment lists, impact events, final positions, and required presentation segment IDs.

Client ACK command: `sprite.motion.presentation.ack`. ACK includes identity, completed status, last segment, presented-through simulation time, and the set of presented required segments. Stale or incomplete ACKs are rejected; duplicate valid ACKs are idempotent.

## Persistence

Save version 4 includes active authoritative trajectory descriptors and completion identities. Restore rehydrates active trajectories and republishes them so presentation can resynchronize. Saves are no longer rejected merely because presentation is pending.
