# VSR Design System

Status: foundation implemented; no product screens or feature UI included.

## Direction

VSR uses Material Design 3 as its design foundation, with Linear as a visual reference for clean hierarchy and balanced information density, and Fluent 2 as a reference for adaptive desktop layout. The system is mobile-first, light-theme-first, and uses Roboto with Google Material Symbols Rounded.

## Structure

- `src/design-system/tokens/`: source-of-truth JavaScript tokens for color, typography, spacing, shape, elevation, and motion.
- `src/design-system/theme/`: theme composition and the initial light theme.
- `src/design-system/foundations/`: global reset, typography/icon baseline, and responsive layout primitives.
- `src/design-system/index.css`: CSS custom properties and shared baseline styles.
- `src/design-system/index.js`: public JavaScript exports.

## Responsive classes

- Compact: 0–599px
- Medium: 600–839px
- Expanded: 840px and wider

Page horizontal padding is 16px, 20px, and 24px respectively. These are VSR design-system breakpoints, not assumptions about a device class.

## Usage

Import the foundation once from the React entry point:

```js
import './design-system/index.css';
```

Import tokens or the theme where needed:

```js
import { lightTheme, spacing, colors } from './design-system/index.js';
```

Use `.vsr-page` for a responsive content width and `.vsr-card` only when content needs a distinct surface. A generic layout container should remain an unstyled layout primitive rather than being presented as a card.

## Rules

- Prefer white surfaces, subtle neutral borders, and restrained elevation.
- Use the 4px spacing base and the published spacing scale.
- Keep corner radii moderate; controls use 6px, cards 8px, dialogs 12px.
- Do not use hover as the only way to discover or operate an action.
- Maintain visible keyboard focus and a minimum 48×48px interactive target where practical.
- Do not hardcode new colors or spacing values in feature UI; extend tokens deliberately.
- Keep presentation concerns inside `src/`; do not couple the design system to the headless engine, protocol, or state runtime.

## Scope

This foundation intentionally does not include screens, navigation, app flows, or feature components. Dark theme is not implemented yet, but theme composition is structured to support it later.
