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
- `presentation`: a client-safe projection of the current scene, active router, and active-router action display metadata. It excludes executable effects, requirements, sibling routers, scenario source, and password definitions.
- `session`: chat state/history, a sanitized active challenge descriptor, and pending/recent notifications.

The snapshot's `state` remains JSON-compatible runtime state. `session.passwordChallenge` is removed from that state copy; the sanitized descriptor is available under top-level `session.passwordChallenge`. Never add password answers or secret scenario data to the presentation/session projection.

## Commands

Commands are allow-listed and serialized per Engine. Command idempotency is keyed by `commandId`, bounded in memory, and is not durable across process restarts.

| Command | Payload | Purpose |
|---|---|---|
| `engine.init` | `{ script }` | Initialize a scenario |
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

For `puzzle`, the client submits the piece arrangement as an array (or JSON-encoded array) of original piece indices in final row-major positions. The Engine validates dimensions and arrangement.

## Scenario and saves

Scenario JSON is separate from save data. Save data uses a versioned `vsr-save` envelope. Runtime queues and timer handles are excluded; supported domain tasks are rehydrated from saved state. Save export contains scenario and runtime data and should be treated as sensitive: do not expose it to an untrusted caller without an explicit product decision and authorization.

## Trust boundary

Do not send scenario source or password answer values to an untrusted client. A local browser host is a development transport, not an authoritative security boundary. For production, run the Engine and password verification on a trusted server and expose only the client-safe projection.
