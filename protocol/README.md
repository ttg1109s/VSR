# VSR Hybrid JSON Protocol v2

Each `GameEngine` instance owns its API facade, state resolver, protocol, and task manager. There is no process-global current Engine.

## State and event cursors

- `stateRevision` is the authoritative state revision. The legacy `revision` field is retained as an alias.
- `eventSequence` advances for every published event, including transient presentation and command-lifecycle events.
- Use `expectedStateRevision` for optimistic concurrency. `expectedRevision` is accepted as a compatibility alias.
- Use `getEventsAfter(sequence)` to resume an event stream. If the bounded event buffer reports a gap, request a fresh snapshot.
- Presentation events describe transient intent; clients derive durable state from snapshots and domain state.

## Snapshot projection

Snapshots expose three separate concerns:
- `game`: current scene/router identity and initialization state.
- `presentation`: a client-safe projection of the current scene, active router, `scenePath`, resolved cover metadata, and active-router action projections. Each action has a stable `key` (`sceneId_routerId_actionId`), normalized `meta`, `presentation` read/display state, `availability` (`canTrigger`, `reason`, `cooldownUntil`) and `runtimeState`. It excludes executable effects, requirements, sibling routers, scenario source, and password answers/definitions.
- `session`: chat state/history, a sanitized active challenge descriptor, and pending/recent notifications.
- `presentation.player`: safe profile projection of the immutable original entry character (`id`, `name`, `description`, `avatar`, `stats`, and relationship tags resolved to character labels).
- `presentation.currentIdentity`: safe descriptor of the identity currently controlled by the player (`id`, `name`, `avatar`, Faker `mode`, and whether it is the original entry character). This may differ from `presentation.player` while Faker is active.

The snapshot's `state` remains JSON-compatible runtime state. It includes `originalEntryCharacter` (immutable scenario entry ID) and `entryCharacter` (current runtime identity, which may change during Faker). `session.passwordChallenge` is removed from that state copy; the sanitized descriptor is available under top-level `session.passwordChallenge`. It may include challenge type, public description, retry/deadline counters, puzzle media/ratio/level, or find-way grid/start/target. It must never include the password definition, expected answer, or find-way solution path.

## Commands

Commands are allow-listed and serialized per Engine. Command idempotency is keyed by `commandId`, bounded in memory, and is not durable across process restarts.

| Command | Payload | Purpose |
|---|---|---|
| `scenario.inspect` | `{ scenario }` | Validate a scenario and return safe metadata without starting gameplay or changing Engine state |
| `snapshot.get` | `{}` | Return the current client-safe snapshot without mutating state or incrementing `stateRevision` |
| `engine.init` | `{ script, enterScene? }` | Load and initialize a scenario; `enterScene: false` defers entry to the configured first scene (default `true` for compatibility) |
| `action.trigger` | `{ actionId, uniqueId? }` | Execute an active-router action |
| `action.markAsRead` | `{ uniqueId }` | Mark an action description as read |
| `chat.next` | `{}` | Advance the active dialogue |
| `chat.selectChoice` | `{ index }` | Select a dialogue choice |
| `inventory.toggleHand` | `{ itemId }` | Equip/unequip an item |
| `item.use` | `{ itemId }` | Use an inventory item |
| `scene.enter` | `{ sceneId, skipTransition? }` | Enter a scene |
| `password.submit` | `{ challengeId, input? , cancel? }` | Submit/cancel an active challenge |
| `engine.pause` / `engine.resume` | `{}` | Pause/resume background Engine tasks |
| `save.export` | `{}` | Export the Engine save envelope |
| `save.restore` | `{ save }` | Restore a validated save envelope |
| `notification.read` | `{ notificationId }` | Mark a notification as read |
| `notification.dismiss` | `{ notificationId }` | Dismiss a pending notification |

An `authorizeCommand` hook can enforce authorization using trusted transport context. It is not an authentication mechanism. For network-facing deployments, construct the Engine with `authorizeCommand` and `requireAuthorization: true`. The transport authenticates the caller and sets a stable principal ID in `context.principal.id` or `context.principalId`; never accept identity from command payloads.

## Password submission

The `password.submit` command requires an active Engine-owned challenge. Its payload includes the issued `challengeId`, raw `input` (unless cancelling), and optionally `cancel: true`. The Engine validates challenge ownership, active scene/router, retry policy, deadline, password definition, and answer. The Client never submits a success flag, retry counter, password configuration, or answer authority.

For `puzzle`, the client submits the piece arrangement as an array (or JSON-encoded array) of original piece indices in final row-major positions. The Engine validates dimensions and arrangement. For `find_way`, the client submits a JSON array of `[x, y]` coordinates from start to target; Engine validates bounds, adjacency, uniqueness and the authoritative path. The snapshot may expose only public challenge hints (`area`, `start`, `target`) and never the expected path. Text challenges submit raw string/number input.

## Scenario inspection and saves

`scenario.inspect` runs the same scenario normalization, schema validation, and reference validation used by initialization. It returns a client-safe metadata projection (`metadata`), structural counts (`summary`), and the normalized format version. It does not call `GameEngine.init`, enter the entry scene, start gameplay tasks, publish a state snapshot, or increment `stateRevision`. The command still produces normal command-lifecycle events and an acknowledgement. The metadata projection is an explicit whitelist; it does not return the scenario source, executable effects, password definitions, or runtime state.

The UI should call `scenario.inspect` after selecting a demo or parsing an imported JSON file, show the returned metadata, and call `engine.init` only after the user confirms.

Scenario JSON is separate from save data. Save data uses a versioned `vsr-save` envelope. Runtime queues and timer handles are excluded; supported domain tasks are rehydrated from saved state. Save export contains scenario and runtime data and should be treated as sensitive: do not expose it to an untrusted caller without an explicit product decision and authorization.

## Snapshot refresh

`client.refreshSnapshot()` sends the read-only `snapshot.get` command without `expectedStateRevision`, then replaces the client snapshot from the returned projection. Use it after `REVISION_CONFLICT`; refresh and ask the user to review the current state. Do not automatically replay a side-effecting command after a conflict.

## Trust boundary

Do not send scenario source or password answer values to an untrusted client. The local HTTP/SSE server binds to localhost for development and is not an authoritative production deployment. For production, run the Engine and password verification on a trusted server and expose only the client-safe projection.
