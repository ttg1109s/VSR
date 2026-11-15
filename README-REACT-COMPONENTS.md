# VSR React components

Presentation-only React components. This layer does not import the engine, protocol, state store or transport.

## Public API

Import from src/design-system/index.js:

\`\`\`jsx
import { Button, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Label, Separator, Dialog, Drawer, Menu, Popover, Tooltip, ToastProvider, useToast } from './design-system/index.js';
\`\`\`

Core primitives: Button supports primary, secondary, tertiary and danger variants, three sizes, loading and icon slots. Input, Textarea and Select support labels, hints, validation errors, required state and forwarded refs. Select accepts options as value/label objects or native option children. Checkbox and Switch retain native input semantics. RadioGroup supports controlled and uncontrolled values plus vertical/horizontal orientation. Label and Separator provide semantic helpers.

Overlay and feedback: Dialog and Drawer are controlled by open/onClose. Drawer supports right, left and bottom placement. Menu accepts a trigger and item descriptors, supports Escape and arrow-key navigation. Popover is a lightweight click-triggered disclosure. Tooltip appears on hover and keyboard focus. Wrap the application once in ToastProvider; useToast returns a toast(message, options) function. Toast tones are default, success, warning and error; action and duration are optional.

## Accessibility and limitations

Native form elements are retained. Inputs associate labels, hints and errors. Dialog and Drawer provide modal semantics, Escape dismissal, a basic Tab focus loop, backdrop dismissal and focus restoration. Menu supports Escape and arrow navigation. Toasts use a polite live region, with errors announced as alerts.

This dependency-free first implementation needs browser-level regression tests before production use, especially for nested overlays, complex menu navigation, screen-reader announcements, mobile viewport behavior and focus edge cases. Popover and Tooltip are intentionally lightweight primitives, not a complete ARIA menu or positioning system.

Import src/design-system/index.css once in the React entry point. Component styles consume the existing --vsr-* tokens.
