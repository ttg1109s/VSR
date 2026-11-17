# VSR React components

Presentation-only React components. This layer does not import the engine, protocol, state store or transport.

## Public API

Import from src/design-system/index.js:

\`\`\`jsx
import { Button, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Label, Separator, Grid, DescriptionList, DescriptionListItem, Dialog, Drawer, Menu, Popover, Tooltip, ToastProvider, useToast } from './design-system/index.js';
\`\`\`

Core primitives: Button supports primary, secondary, tertiary and danger variants, three sizes, loading and icon slots. Its `layout="card"` variant provides a shared icon-and-copy action-card layout. ProgressBar supports indeterminate, complete and determinate native progress states. Input, Textarea and Select support labels, hints, validation errors, required state and forwarded refs. Select accepts options as value/label objects or native option children. Checkbox and Switch retain native input semantics. RadioGroup supports controlled and uncontrolled values plus vertical/horizontal orientation. Label and Separator provide semantic helpers.

Overlay and feedback: Dialog and Drawer are controlled by open/onClose. Drawer supports right, left and bottom placement. Menu accepts a trigger and item descriptors, supports Escape and arrow-key navigation. Popover is a lightweight click-triggered disclosure. Tooltip appears on hover and keyboard focus. Wrap the application once in ToastProvider; useToast returns a toast(message, options) function. Toast tones are default, success, warning and error; action and duration are optional.


## Layout primitives and data patterns

- `Grid` is a responsive layout primitive. Use `columns="auto"` for content-driven columns, `columns="2"` / `columns="3"` for explicit layouts, or `columns="responsive-cards"` for one column at Compact, two at Medium, and three at Expanded. `gap` accepts the published spacing steps `1`, `2`, `3`, `4`, or `6`.
- `DescriptionList` preserves native `dl` semantics while separating list structure from item layout. Use `layout="list"` for a single list or `layout="grid"` with `columns="auto"`, `"2"`, or `"3"` to arrange items responsively. `gap` accepts `compact` or `comfortable`; `divided` enables separators in list mode.
- `DescriptionListItem` renders a semantic `dt` / `dd` pair. Each item can choose `layout="stacked"` (label above value) or `layout="inline"` (label beside value), and `span="full"` to occupy the full grid row. Empty values are omitted.

Example:

~~~jsx
<DescriptionList layout="grid" columns="auto" gap="comfortable">
  <DescriptionListItem label="Author" value="VSR Team" />
  <DescriptionListItem label="Version" value="1.1.0" />
  <DescriptionListItem label="License" value="A long license description" span="full" />
</DescriptionList>
~~~

Pages choose composition and variants; the shared primitives own responsive behavior and visual styling.

## Accessibility and limitations

Native form elements are retained. Inputs associate labels, hints and errors. Dialog and Drawer provide modal semantics, topmost-overlay Escape handling, a Tab focus loop that excludes hidden controls, backdrop dismissal and focus restoration. Menu supports Escape and arrow navigation. Toasts use a polite live region, with errors announced as alerts.

Chromium browser regression tests cover nested dialogs, topmost-overlay Escape handling, focus restoration, Menu dismissal callbacks and compact viewport bounds. These tests are a baseline, not a substitute for manual screen-reader testing or a full WCAG audit. Popover and Tooltip are intentionally lightweight primitives, not a complete ARIA menu or positioning system. Popover and Tooltip are intentionally lightweight primitives, not a complete ARIA menu or positioning system.

Import src/design-system/index.css once in the React entry point. Component styles consume the existing --vsr-* tokens.
