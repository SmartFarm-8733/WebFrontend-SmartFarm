# ICHU · SmartFarm Web

Angular frontend for livestock management, based on the SmartFarm report and the supplied ICHU mockups.

## Run

```sh
npm ci
npm start
```

Default Angular development URL: http://localhost:4200.

On Windows machines where Application Control blocks the native build parser, use the optional Angular Webpack compatibility target:

```sh
npm run start:compat
```

Do not disable operating-system security. The compatibility builder is deprecated upstream and is a temporary local fallback; the default build remains Angular's current application builder.

## Verify

```sh
npm run typecheck
npm run build
npm run test:e2e
```

For local Windows verification:

```powershell
npm run build:compat
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

Browser tests require a local Chromium browser or Microsoft Edge. CI installs Chromium. Preview a compiled build with `npm run preview` or `npm run preview:compat` at http://127.0.0.1:4180.

## Stack and architecture

- Angular 22.2.2, standalone components, signals and zoneless change detection.
- Angular Material/CDK and SCSS design tokens.
- Outfit and Plus Jakarta Sans, self-hosted from Fontsource packages.
- TypeScript 6.0.3; reference Node.js 24.19.0.
- Seven domain-aligned frontend features, each with domain, application, infrastructure and presentation layers.

```text
src/app/
  core/
    config/       # Language, demo workspace and composition
    layout/       # Responsive shared shell
  shared/
    domain/       # Minimal shared contracts
    presentation/ # Neutral UI components
  features/
    identity-access-management/
    cattle-information/
    iot-assets/
    operations-monitoring/
    planning/
    dashboard-analytics/
    subscription-plans/
src/styles/tokens/
public/assets/images/
tests/e2e/
```

[Architecture and business boundaries](docs/architecture.md). Empty directories retain `.gitkeep` until implementation fills them.

## TB1 boundaries

The frontend uses fictional, in-memory demonstration records. Reloading resets those records; only language preference is persisted. It does not authenticate users, charge payments, deliver messages, operate hardware or supply a veterinary diagnosis. Do not enter sensitive information.

The demo starts in English (`en_US`) and supports Spanish (`es_419`). The mobile application, public landing page, edge software and .NET API are separate containers.

## Collaboration

Create short-lived `feature/<kebab-case-name>` branches from `main`; integrate shared foundations before dependent modules. Use English Conventional Commits, one changed file per commit as agreed for this implementation, and pull requests to `main`. Integration merge commits are separate from file-level implementation commits.

Do not commit dependencies, generated builds, test output, credentials or tokens. Keep the lockfile versioned. GitHub Actions checks types, production compilation and browser behavior.
