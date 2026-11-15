# VSR Client Rendering Architecture

The browser client is a presentation layer over the existing VSR Engine and Hybrid JSON Protocol v2. It does not maintain a parallel game state.

## Runtime flow

```text
GameEngine
  └─ JsonProtocol (snapshots + presentation events)
       └─ EngineAdapter
            ├─ authoritative state snapshot → constrained gameplay view model
            └─ protocol event stream
                 └─ PresentationAdapter
                      └─ GameplayRenderer
                           ├─ SceneRenderer
                           │    └─ MediaRenderer
                           ├─ ActiveRouterRenderer
                           ├─ ActionRenderer
                           └─ OverlayRenderer
```

## State projection contract

The renderer-facing gameplay hierarchy is strictly:

`currentScene → activeRouter → actions belonging to activeRouter`

- `EngineAdapter` reads the authoritative `JsonProtocol.createSnapshot()` result.
- Current scene and active router IDs come from `snapshot.game.sceneId` and `snapshot.game.routerId`.
- The scene view is a constrained projection containing only the current scene's `id`, `meta`, and `set`. It does not expose its `routers` collection.
- The router view contains only the active router's `id`, `meta`, and `set`.
- Action definitions are resolved only with `engine.getEffectiveActions(sceneId, routerId)`. No global action enumeration or sibling-router traversal is used.
- Action runtime state is resolved using the Engine's `sceneId_routerId_actionId` key. `display: hide` is omitted; `display: locked` is rendered disabled.
- A state snapshot causes the view model to be recomputed. Scene and router transitions therefore replace the current projection from Engine-confirmed state.

## Presentation event contract

`PresentationAdapter` consumes the EngineAdapter's protocol stream and forwards normalized `presentation.*` events.

- `presentation.scene.render` is reduced to `sceneId`, `routerId`, and the active router's action IDs. The raw scene object and sibling routers are not forwarded to renderers.
- Chat events currently handled: `chat.renderBubble`, `chat.renderChoices`, `chat.clearChoices`, `chat.inputVisible`, `chat.inputHidden`, and `chat.toggleOverlay`.
- Notification events handled: `notification.add`, `notification.alert`, `notification.updated`, `notification.dismiss`, `notification.expired`, and `notification.cleared`.
- Other handled events include password keyboard requests, scene transitions, timer updates, timer hiding, and navigation blocking.

## Media contract

The scenario schema defines:
- `scene.meta.cover`: default scene photo/video cover, as a media reference or supported object.
- `router.meta.cover`: router-specific cover; overrides the scene cover. String references support `video:` and `photo:` prefixes or a key in `scenario.media`.
- `scenario.media[id]`: a media definition with `type` (`photo`, `video`, or `sound`) and `url`.

`MediaRenderer` currently renders scene/router photo and video covers. Music and ambience playback are not implemented yet.

## Commands

UI interactions are sent through the existing protocol command allow-list:
- `action.trigger`
- `chat.next`
- `chat.selectChoice`
- `inventory.toggleHand`
- `password.submit`

The adapter attaches `expectedStateRevision` to commands. Acknowledgements and subsequent snapshots remain authoritative; the UI does not mutate Engine state optimistically.

## Current renderer coverage

Implemented:
- Current scene metadata and cover
- Active router metadata
- Active router action list and action display state
- Dialogue bubbles, choices, continue interaction
- Notification toast/modal presentation
- Password challenge input
- Scene transition cue and router timer display
- Mobile-first layout and responsive desktop enhancement

Not yet implemented:
- Character/contact list and character detail UI
- Inventory/explorer/item detail UI
- Player card and item modal components
- Full VFX strategy rendering and overlay flicker
- Music and ambience playback
- Full puzzle-specific visual input components (current password UI is a generic text input)
- Save/load UI and session persistence

## Trust boundary

The current Demo Play / Load JSON flow runs the Engine locally in the browser. This is appropriate for local prototyping, not an authoritative multiplayer or untrusted-client deployment. The protocol documentation's security guidance still applies: for a network-authoritative deployment, keep scenario source and password verification on a trusted server, require command authorization, and expose only the client-safe projection.
