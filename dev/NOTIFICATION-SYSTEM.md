# VSR Notification System

## Product contract

The notification system has one authoritative runtime owner: Engine. Scenario effects express notification intent; Engine validates and normalizes that intent; the React presentation layer renders the resulting events and snapshot projection.

The presentation UI is English-only. Scenario-authored notification titles and messages are data and must remain unchanged in their original language.

## Interaction model

- The Notify item in Bottom Navigation opens the Notification Center Drawer; it does not navigate away from the active scene.
- The Drawer is the durable notification history surface. It supports All, Unread, Scenario, and System filters, date grouping, mark-read, mark-all-read, dismiss, and a sound preference.
- Toast is transient feedback. A Toast being removed must not mark its notification read or delete it from Engine history.
- A maximum of five Toasts may be visible at once.
- Modal notifications are reserved by Engine policy for danger and special levels. A scenario request for a Modal at another level is downgraded to Toast.
- Engine history is authoritative and bounded. The client must not maintain a separate authoritative notification store.

## Notify Effect contract

Existing fields remain compatible: type, subtype, title, text, level, and dedupeKey.

Optional scenario intent fields:
- category: category label used for filtering and grouping.
- priority: requested priority, clamped by Engine to the supported range.
- durationMs: requested Toast lifetime in milliseconds; Engine validates and clamps it.
- sound: whether this notification requests a sound. Defaults to true.
- soundProfile: default, soft, success, warning, critical, or special.

The scenario can request presentation and sound profile. Engine policy remains authoritative and can downgrade presentation. A user-level sound-off preference always overrides scenario requests.

## Sound behavior

The React layer uses Web Audio API and creates short synthesized tones; it does not require bundled audio files. AudioContext is initialized/resumed only in response to a user gesture. If the browser blocks audio, notifications continue to render and queued sound requests are attempted after the next user gesture. No Engine module imports browser APIs.

## Event and state rules

- presentation.notification.add creates a Toast and plays the requested sound when enabled.
- presentation.notification.alert opens the Engine-approved Modal and plays the requested sound when enabled.
- presentation.notification.updated updates durable state but does not replay sound.
- Snapshot hydration never plays sounds or creates Toasts.
- Event IDs are deduplicated in the application layer.
- Read and dismiss operations are commands to Engine. Toast dismissal is presentation-only.
- Notification history remains available in the Drawer after Toast expiry.

## Engineering constraints

Use public Design System components for Drawer, Dialog, Button, Badge, Switch, and ToastProvider. Feature CSS is limited to Notification Center composition and consumes existing Design System tokens. Do not add page-level styling or direct safe-area environment reads. Keep Engine independent of React and browser APIs.
