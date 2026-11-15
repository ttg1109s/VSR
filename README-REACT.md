# React application scaffold

This repository keeps the VSR runtime framework-agnostic. The React application is a separate presentation-layer entry point at the repository root.

## Commands

- `npm run dev` — start the Vite development server.
- `npm run build` — create the production bundle in `dist/`.
- `npm run preview` — preview the production bundle locally.

The React root intentionally renders no UI yet. No game screen, components, styling system, or presentation behavior is included in this scaffold.

## Deployment

The GitHub Actions workflow `.github/workflows/deploy-react-pages.yml` builds the app on pull requests targeting `engine-only`. On pushes to `engine-only`, it builds and deploys `dist/` to GitHub Pages.

The Vite base path is configured for the project site `/<repository-name>/`.

For the first deployment, configure the repository's Pages publishing source to **GitHub Actions** in Settings → Pages. The workflow requires the repository to permit Pages deployments.
