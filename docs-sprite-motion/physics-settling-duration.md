# Sprite Impact Physics: Adaptive Settling Duration

## Behavior

Impact-enabled sprite motions no longer use a fixed post-impact horizon as the preferred stop time. The coordinator starts with a short post-impact window and expands the simulation window until affected physics bodies meet the settling criteria or the configured safety cap is reached.

## Configuration

- `physics.maxPhysicsDuration`: preferred explicit maximum post-impact duration (seconds).
- `physics.horizon`: legacy safety cap, used when `maxPhysicsDuration` is not specified.
- `physics.settlingVelocityThreshold`: terminal speed threshold; default `0.05` world units/s.
- `physics.settlingDuration`: minimum elapsed time after the latest impact while the terminal state remains settled; default `0.2` seconds.

The duration is adaptive, not unbounded. If the model contains no damping/drag and bodies retain nonzero velocity, the physics simulation cannot naturally settle; it expands to the safety cap. A future damping model is needed to calculate a finite physical stopping time for free-moving bodies.

## Static and kinematic bodies

Static and kinematic bodies use zero inverse mass for collision impulses and penetration correction. Static bodies also receive no gravity acceleration in the post-impact segment. This prevents a declared static collider from moving due to collision impulses.

## Test coverage

Regression tests cover early settling against a static wall with zero restitution, immovable static-body behavior, and the expected rebound velocity for a dynamic body hitting a static wall.
