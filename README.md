# SmartFarm Web Frontend

Initial Angular structure for **ICHU**, the livestock management product of SmartFarm.

This repository currently contains project configuration and architecture placeholders only. The application starts with a blank page by design. There are no business features, authentication flows, mock services, API connections, payment operations or device integrations.

## Technology baseline

- Angular 22.2.2 and TypeScript 6.0.3.
- Angular Material and CDK 22.2.2, installed but not yet themed or used.
- HTML and SCSS.
- Standalone application bootstrap and empty router configuration.
- Node.js 24.19.0 is the reference environment; compatible alternatives are listed in `package.json`.

Dependencies are pinned, and `package-lock.json` must remain versioned.

## Run locally

```sh
npm ci
npm start
```

Open http://localhost:4200. An empty page is the expected result at this stage.

## Verify the scaffold

```sh
npm run build
```

The build output is generated in `dist/smartfarm-web/` and is not versioned. A production build validates the scaffold; it does not replace a test suite. No test runner or application tests have been introduced yet.

## Project structure

```text
public/
  assets/
    fonts/
    icons/
    images/
  i18n/
docs/
  architecture.md
src/
  app/
    core/
      config/
      layout/
    shared/
      domain/
      presentation/
    features/
      identity-access-management/
      cattle-information/
      iot-assets/
      operations-monitoring/
      planning/
      dashboard-analytics/
      subscription-plans/
    app.ts
    app.html
    app.config.ts
    app.routes.ts
  environments/
  styles/
    themes/
    tokens/
  index.html
  main.ts
  styles.scss
tests/
  e2e/
```

Each feature has `domain/`, `application/`, `infrastructure/` and `presentation/` folders. Empty folders contain `.gitkeep` so Git can retain the agreed structure.

See [Architecture](docs/architecture.md) for responsibilities and dependency boundaries.

## Delivery boundaries

For TB1, the frontend will be implemented and deployed independently of the backend. Future simulated-data adapters must be distinguishable from real integrations. The structure does not imply that any user story is already implemented.

The landing page, mobile application, .NET backend, databases and embedded applications are separate products and do not belong in this repository.

## Collaboration

Use short-lived `feature/<kebab-case-name>` branches from `develop`, Conventional Commits and pull requests for integration. `main` is the stable delivery branch. Do not commit generated output, credentials or dependencies.

Suggested initial commit:

```text
chore: initialize Angular frontend structure with DDD boundaries
```
