# VSR React application

The React application is a presentation layer over the framework-agnostic VSR runtime. It consumes the runtime through the JSON client and transport adapters; React pages do not import or call Engine modules directly.

## Application structure

- `src/main.jsx` — React entry point and one-time Design System stylesheet import.
- `src/App.jsx` — application lifecycle, scenario import/demo orchestration and runtime ownership.
- `src/pages/` — Home, Scenario Preview, Loading and Playing page compositions.
- `src/components/` and `src/features/` — application-specific UI and feature orchestration.
- `src/design-system/` — public components, Contact Workspace patterns, navigation/media primitives, foundations and tokens.
- `client/adapters/` — JSON client and transport adapters used by the presentation layer.
- `engine/` and `protocol/` — runtime and protocol implementation; these remain independent of React.

## Commands

- `npm run dev` — start the Vite development server.
- `npm run build` — create the production bundle in `dist/`.
- `npm run preview` — preview the production bundle locally.
- `npm test` — run the Node.js test suite.
- `npm run audit:state:strict` — enforce the Engine state-access allowlist.
- `npm run audit:ui` — reject page-owned stylesheets and inline presentation.
- `npm run audit:deadcode` — report source files unreachable from application, runtime, test, tool and package-export entry points; candidates require manual review before deletion.

## Architecture rules

Pages compose public Design System APIs and own only page-level state, data binding and orchestration. Shared styling is imported once from `src/design-system/index.css`. Runtime state remains Engine-owned and is projected through the JSON Protocol and Client Adapter.

A feature component may retain colocated CSS only when its structure/behavior is genuinely feature-specific and the Design System API cannot express it reasonably. This exception must not be used to override internal shared component selectors or recreate design tokens.

## Deployment

The GitHub Actions workflow `.github/workflows/deploy-react-pages.yml` builds the app on pull requests targeting `engine-only`. On pushes to `engine-only`, it builds and deploys `dist/` to GitHub Pages.

The Vite base path is configured for the project site `/<repository-name>/`. For the first deployment, configure the repository's Pages publishing source to **GitHub Actions** in Settings → Pages.
