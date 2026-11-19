# Migration: School Memory vs Evidence

## Branch
`feature/school-branch-memory-evidence` based on `engine-only`.

## Audit snapshot
- Scenario file: `demo_script.js` (5,975 lines at audit time).
- 63 Action definitions.
- School classroom actions: `action_examine_blackboard`, `action_read_blackboard`, `action_inspect_student_seat`, `action_inspect_class_clock`, `action_inspect_evacuation_notice`, `action_check_desk`, `action_talk_linh`, `action_decode_roster`, `action_recover_class_register`, `action_find_radio_toolkit`, `action_find_tracing_paper`, `action_find_inspection_loupe`, `action_overlay_map`.
- Existing `final_choice` is reserved for ending choice and MUST NOT be reused for the school commitment.
- Existing progression templates `station_ready` and `release_ready` are currently Evidence-heavy; branch-aware alternatives are required to avoid Memory softlock.

## Design state
Add only `school_choice`: `undecided | memory | evidence`. Keep ending state `final_choice` separate.

## School Action migration
| Action | Migration |
|---|---|
| `action_examine_blackboard`, `action_read_blackboard`, `action_inspect_student_seat`, `action_inspect_class_clock`, `action_inspect_evacuation_notice` | Shared investigation; retain common clues |
| `action_check_desk` | Shared conflict discovery only; remove exclusive reward bundle |
| `action_talk_linh` | Memory commitment; set state before chat; hide once committed |
| `action_recover_class_register` | Evidence commitment; set state before register reward/router; hide once committed |
| `action_decode_roster` | Evidence follow-up; branch-gated |
| `action_find_radio_toolkit` | Shared optional tool |
| `action_find_tracing_paper` | Shared optional tool, not mandatory for Memory |
| `action_find_inspection_loupe` | Shared optional tool, not mandatory for Memory |
| `action_overlay_map` | Optional route puzzle; avoid branch-exclusive hard prerequisite |
 
## Cross-demo audit hotspots
- `station_ready`: currently requires truth fragments, archive, tunnel manifest, and evacuation film.
- `release_ready`: currently requires truth fragments, bell, archive and evacuation seal.
- `action_reach_station`, `action_descend_tunnel`, `action_choose_fate`, and ending actions need branch-aware progression verification.
- Scene routers and dialogue should react to `school_choice`; branch-specific consequences are planned for inn, square, chapel, forest, mill, tunnel, station.
 
## Regression checklist
- New Game resets school_choice to undecided.
- Both commitments available only while undecided.
- Commitment is set before chat or reward/router.
- Opposing commitment is engine-gated, not merely hidden.
- Evidence-only rewards do not leak into Memory; Memory-specific dialogue/rewards do not leak into Evidence.
- Save/load retains branch.
- Both routes can reach tunnel, station and at least one ending.
- Direct trigger of opposing Action is rejected.
- Test both complete playthroughs after migration.
 
## Implementation status
Implemented on the isolated feature branch:
- Added `school_choice` state; ending `final_choice` remains separate.
- Reworked desk Action to expose the conflict without granting both branch reward bundles.
- Memory commitment through `action_talk_linh`; state and opposing Action locks are applied before chat transition.
- Evidence commitment through `action_recover_class_register`; branch state is written before record reward.
- `action_decode_roster` is Evidence-only.
- Memory receives the tunnel clue route; Evidence receives map fragment through roster decoding.
- Archive and mill requirements use supported flat engine checks.
- Added dedicated Memory station and release Actions; Evidence progression templates remain flat and separate.
- Added branch-reactive dialogue at the village square (Mai) and inn (Hạnh).
- Added branch-context reactions in chapel, forest, and tunnel investigation Actions.
- Added `tests/school-branching.test.js`.

## Remaining before merge
- Non-release endings and some later scene Actions remain common rather than branch-exclusive; audit and add consequences only where they affect narrative or route decisions.
- Confirm the scenario against the generated schema and run `npm test`, `npm run build`, and two complete playthroughs. These cannot be run from the GitHub connector environment.
- Test save/load and New Game reset for `school_choice` in the actual client.
- Verify both branch routes through the mill/tunnel and station with inventory constraints and all Action routers.
