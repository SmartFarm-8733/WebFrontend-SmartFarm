# Frontend architecture

## Decision

Use a single Angular application, organized by business capability and aligned with the seven final bounded contexts described in the SmartFarm report. Apply lightweight layered separation inside each feature.

This is the frontend's internal organization, not the .NET backend's modular monolith and not a microfrontend architecture. No backend aggregates, controllers, ORM repositories or persistence schemas are implemented here.

## Business boundaries

| Feature folder | Responsibility |
|---|---|
| `identity-access-management` | Account, professional profile, memberships and herd advisory access. |
| `cattle-information` | Animal identity and lifecycle, lots and paddocks. |
| `iot-assets` | Device inventory, assignments and connection status. |
| `operations-monitoring` | Telemetry, alerts, geofences, field events, clinical interventions and water monitoring. |
| `planning` | Campaigns, reminders, follow-up reviews and withdrawal periods. |
| `dashboard-analytics` | Indicators, trends and reports derived from the other contexts. |
| `subscription-plans` | Plans, subscriptions, feature coverage and device limits. |

Profiles belong to Identity & Access Management; they are not an eighth feature. The animal detail screen links to monitoring using its herd-scoped ear tag; it is not another bounded context.

## Layers inside a feature

| Folder | Responsibility |
|---|---|
| `domain` | Plain TypeScript business models, state definitions and data-access contracts. No Angular or vendor imports. |
| `application` | Feature use cases and state coordination. Depends on domain contracts, not concrete data adapters. |
| `infrastructure` | Root-lifetime, in-memory TB1 adapters; future HTTP integration and DTO mapping. |
| `presentation` | Angular pages, forms and UI components. Uses application services, not direct storage or external API calls. |

Domain dependencies point inward. Infrastructure implements contracts declared by the domain. Application facades depend on those contracts. The application composition root and page provider metadata select adapters; presentation behavior does not call concrete adapters or browser storage.

Client-side validation assists users; authoritative business rules and authorization remain the responsibility of the future backend. Route visibility and demo sessions are not security controls.

## Shared and cross-cutting areas

- `core/config`: application-wide configuration and integration setup.
- `core/layout`: responsive shell, workspace navigation and demonstration terms.
- `shared/domain`: deliberately small shared identifiers or value types, without feature-owned behavior.
- `shared/presentation`: reusable, business-neutral UI building blocks.
- `src/environments`: public runtime/build configuration only; never secrets.
- `src/styles/tokens`: ICHU visual tokens; `src/styles.scss` composes the Material theme and self-hosted fonts.
- `public/assets`: static media.
- `core/config/locale.service.ts`: English and Latin American Spanish copy selection, number/date formatting and the only persisted preference. Empty catalog folders are reserved for a future catalog-based translation solution.
- `tests/e2e`: browser journeys, accessibility checks and pure domain regression tests using Playwright's runner.

Cross-feature composition lives in `core/config/overview-source.ts` and uses domain repository contracts. The dashboard has no duplicate inventory: it derives animals, alert counts, campaign progress and connectivity from the root adapters. Feature-specific behavior does not belong in shared folders.

## TB1 and subsequent integration

TB1 contains executable demonstration journeys: animal registration and lifecycle, device assignments, operational alert responses, clinical and reproductive records, campaigns, advisories, profile editing and simulated plan selection. Navigation preserves in-memory mutations; reloading resets them. English is the initial language. The veterinarian can view only the linked demonstration herd and cannot modify inventory or campaigns.

The fixtures represent two small fictional herds, not an actual customer dataset. The sample clock is October 8, 2026 in Peru. GPS coordinates, telemetry and connection states are illustrative, not live; clinical signals are not diagnoses. Nutrition estimates and campaign fixtures are independent demonstration records, not a forecasting or medical engine. The current adapters do not publish cross-context domain events: complete lifecycle synchronization, remote authorization and real-time reconciliation belong to backend integration.

Subsequent HTTP adapters will consume the .NET REST API over HTTPS and JSON through these contracts. Synchronous TB1 ports will need explicit asynchronous loading and error states. The web application remains one C4 frontend container; mobile, edge, landing page and API are separate applications.

Real Firebase authentication, cloud notifications, payments, telemetry and offline synchronization are not implemented. Login validates format only or opens an explicit demo role; recovery sends no email. The checkout requests no card, bank or identity-document details. Never store passwords, card details or production tokens in demo browser storage. The future API must enforce all permissions, quotas and transitions independently of the client.

## Verification and integration

Run `npm run typecheck`, a production build and `npm run test:e2e`. Browser checks cover every sidebar destination, herd/language switching, registration uniqueness, alert transitions, desktop accessibility and mobile overflow. Domain regressions cover invalid dates and lifecycle/assignment rules. A Windows compatibility build is available without changing Application Control; it is a temporary fallback to the default Angular application builder used in CI.

Keep each feature in its own short-lived branch. Merge the shared foundation before dependent feature PRs, then merge the final routing/composition PR. File changes use individual Conventional Commits; integration merges are separate. GitHub PR review and final CI remain required before merging `main`.

## References

- [SmartFarm report, Chapter IV](https://github.com/SmartFarm-8733/Report-SmartFarm/blob/main/report/40-solution-software-design.md)
- [SmartFarm report, Chapter V](https://github.com/SmartFarm-8733/Report-SmartFarm/blob/main/report/50-solution-ui-ux-design.md)
- [Angular style guide](https://angular.dev/style-guide)
- [Angular version compatibility](https://angular.dev/reference/versions)
