# Sprite benchmark baseline (2026-11-26)

Environment: Node 22.16.0 in the provided Linux container. These are one-run exploratory timings, not CI regression thresholds.

| Workload | Sprites | Wall ms | Broadphase candidates | Narrowphase checks | Events | Status |
|---|---:|---:|---:|---:|---:|---|
| Sparse | 10 | 1.56 | 2 | 2 | 0 | completed |
| Sparse | 100 | 1.91 | 24 | 24 | 0 | completed |
| Sparse | 1,000 | 19.38 | 249 | 249 | 0 | completed |
| Sparse | 10,000 | 165.66 | 2,499 | 2,499 | 0 | completed |
| Dense cluster | 500 | 135.10 | 41,042 | 41,042 | 0 | completed |
| High velocity | 100 | 1.86 | 74 | 74 | 1 | completed |

The dense workload currently measures candidate explosion but does not produce collisions because its bodies are initially overlapping and stationary; this is intentional as a broad-phase stress case, not a solver-density benchmark. It should not be read as a complete high-collision-density benchmark.
