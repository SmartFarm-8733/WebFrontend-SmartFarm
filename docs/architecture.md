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

Profiles belongs to Identity & Access Management; it is not an eighth feature. A composed animal detail screen can display information from several contexts without duplicating their source data or creating a new bounded context.

## Layers inside a feature

| Folder | Responsibility |
|---|---|
| `domain` | Plain TypeScript business models, state definitions and data-access contracts. No Angular or vendor imports. |
| `application` | Feature use cases and state coordination. Depends on domain contracts, not concrete data adapters. |
| `infrastructure` | Future simulated or HTTP adapters, external-service integration and DTO mapping. |
| `presentation` | Angular pages, forms and UI components. Uses application services, not direct storage or external API calls. |

Domain dependencies point inward. Infrastructure implements contracts declared by the domain. The application composition root selects concrete implementations. Presentation must not depend directly on infrastructure.

Client-side validation assists users; authoritative business rules and authorization remain the responsibility of the future backend. Route visibility and demo sessions are not security controls.

## Shared and cross-cutting areas

- `core/config`: application-wide configuration and integration setup.
- `core/layout`: application shell and navigation composition, when implemented.
- `shared/domain`: deliberately small shared identifiers or value types, without feature-owned behavior.
- `shared/presentation`: reusable, business-neutral UI building blocks.
- `src/environments`: public runtime/build configuration only; never secrets.
- `src/styles/tokens` and `src/styles/themes`: future visual tokens and Angular Material theme.
- `public/assets`: static media.
- `public/i18n`: empty `en_US` and `es_419` catalogs; translation behavior is not implemented.
- `tests/e2e`: location reserved for future cross-feature user-flow tests. Unit tests should be colocated with the code they test.

Avoid direct access to another feature's internal models or adapters. Cross-feature composition should use explicit public contracts. Do not populate shared folders with feature-specific logic.

## TB1 and subsequent integration

At present every business-layer folder is empty. Future TB1 implementation will use simulated adapters with consistent fixtures. Subsequent HTTP adapters will consume the .NET REST API over HTTPS and JSON through the same contracts, without rewriting presentation code.

Real Firebase authentication, cloud notifications, payments, telemetry and offline synchronization are not implemented by this scaffold. Never store passwords, card details or production tokens in demo browser storage.

## References

- [SmartFarm report, Chapter IV](https://github.com/SmartFarm-8733/Report-SmartFarm/blob/main/report/40-solution-software-design.md)
- [SmartFarm report, Chapter V](https://github.com/SmartFarm-8733/Report-SmartFarm/blob/main/report/50-solution-ui-ux-design.md)
- [Angular style guide](https://angular.dev/style-guide)
- [Angular version compatibility](https://angular.dev/reference/versions)
