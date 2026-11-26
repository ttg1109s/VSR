# Sprite Motion / Physics v2 — F-02 Corrective Release

## Status

F-02 exact-center impulse fallback corrected. The previous fallback derived the normal from relative velocity using an orientation inconsistent with the impulse solver, allowing an approaching pair to be classified as separating and receive no impulse.

## Change

- Exact-center collision normal fallback is now deterministic +X in CCD and impulse resolution.
- Impulse resolution evaluates approaching/separating state against the same fallback convention.
- Separating exact-center pairs receive no spurious impulse.
- Penetration correction continues using deterministic fallback.

## Regression coverage

- Exact-center approaching pair: positive impulse and expected post-impact velocities for restitution 0.5.
- Exact-center separating pair: zero impulse and unchanged velocities.
- Authoritative simulation: exact-center approaching collision produces expected post-impact velocities.
- Existing exact-center authoritative test retained.

## Validation

- Full test suite: 329/329 PASS.
- Stress suite: 75/75 PASS.
- JavaScript syntax: PASS.
- JSON schema/data parsing: PASS.
- ZIP integrity: PASS.

## Limitation

At exact center, geometric orientation is undefined. The deterministic +X convention resolves the numerical ambiguity but does not guarantee pair-order symmetry for exact-center pairs without stable identity or pre-contact information.
