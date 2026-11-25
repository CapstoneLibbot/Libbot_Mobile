# LiBot Mobile architecture

## Product boundary

LiBot Mobile is the public kiosk client for a library robot. It supports two visitor workflows: find a book and request guidance to its shelf; find a facility/area and request guidance to it. It never controls ROS2 or robot hardware directly.

## Implemented architecture
 
The codebase is mid-transition from mock-first adapters to feature-owned backend adapters. Catalog is the first feature integrated with the existing backend.
 
- `app/`: Thin Expo Router adapters for routing, layouts, and parameter parsing. Screens are pure UI components driven by explicit input props and output navigation callbacks; feature components never call `router` or `useLocalSearchParams`.
- `src/config/`: Zod-validated public environment configuration. `env.ts` selects mock mode when `EXPO_PUBLIC_API_BASE_URL` is absent outside production.
- `src/core/`: Providers (`AppProviders`, `QueryProvider`), kiosk session state (`kioskStore`), server-state query keys (`queryKeys`), orientation policy, idle policy, and adapter composition (`repositories.ts`).
  > **Critical Expo Router Rule:** Never name this directory `src/app/`. In Expo Router, if `src/app/` exists, Expo Router automatically overrides the root `app/` directory and treats `src/app/` as the route tree. That causes non-route foundation code, tests, and stores to be registered as routes, crashing the app at launch.
- `src/features/`: Feature slices (`catalog`, `facilities`, `guidance`, `feedback`, `idle`). The catalog slice owns its backend DTOs, mapper, and HTTP implementation in `catalog/api/`; its screens remain transport-agnostic. Other feature slices are still backed by mocks.
- `src/services/`: Shared transport services. `services/api/client.ts` is the Axios client, `apiError.ts` normalizes ASP.NET Core errors, and `services/realtime/signalR.ts` handles the currently available robot heartbeat hub.
- `src/platform/`: Legacy HTTP and typed-realtime adapters, plus secure storage and network connectivity. Do not add new feature API work here; migrate or remove these legacy HTTP/realtime modules once their consumers move to `src/services`.
- `src/shared/`: Domain-neutral design system and utilities.
  - `src/shared/ui/`: Pure presentation primitives (`AppButton`, `AppCard`, `AppHeader`, `AppInput`, `AppText`, `StatusBadge`, `IndoorMap`, etc.).
  - `src/shared/theme/`: Visual design tokens, colors, typography, spacing, radius, shadows.
  - `src/shared/layout/`: Responsive width classes (compact `<600dp`, medium `600–839dp`, expanded `≥840dp`), layout tokens, and `useResponsiveLayout`.
  - `src/shared/lib/`: Generic math, date, string formatting, and coordinate projection utilities (`indoorMapTransform`, `dateUtils`, `formatUtils`, `mapUtils`, `useDebounce`).
  - `src/shared/types/`: Domain-neutral TypeScript contracts.
- `src/testing/`: Testing fixtures (`booksFixture`, `facilitiesFixture`, `jobsFixture`), fake repositories (`mock*Repository`), and route contract test suites. Production code is strictly blocked by ESLint boundary rules from importing anything in `src/testing`.

Feature screens call feature hooks; hooks call a feature API module or repository interface; feature API modules use `src/services`. Shared/services/platform modules never import feature screens or routes. Production code never imports test fixtures.

## Runtime configuration and backend status

Catalog reads `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_SIGNALR_URL`; both are public build-time values and cannot contain secrets. The API base URL includes `/api`, for example `http://192.168.1.8:5205/api` for a real device on the same LAN. Devices must not use `localhost`.

Catalog uses `GET /book-guidance/search`, `GET /book-guidance/books/{id}`, and `GET /book-categories`. It maps backend DTOs before they reach UI components and displays normalized Vietnamese error messages. Existing `src/core/config` and `src/platform/http` still use the old environment-variable scheme and are legacy modules pending migration; they must not be used for new API integrations.

The new SignalR service connects only when configured and currently subscribes to `ReceiveHeartbeat` from `/robotHub`. Guidance job progress, robot pose, and route data are not yet integrated because the current backend hub does not publish those events. See [INTEGRATION.md](INTEGRATION.md) for the active routes and next integration order.

## Responsive kiosk policy

Kiosk experiences request landscape while the `(kiosk)` layout is active. The app must not retain a global landscape lock after refactoring: non-kiosk routes remain adaptive on phone and tablet. Use logical window width classes: compact below 600dp, medium 600–839dp, expanded at least 840dp.

Use safe-area-aware fluid layouts, preserve state across orientation changes, and keep touch targets at least 44×44dp. Each UI change is verified at compact phone portrait, tablet portrait, and expanded tablet landscape, including loading, empty, error, long Vietnamese text, keyboard, and active guidance.

## Quality gate

Run the following before merging a structural change or creating a preview build:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
```

For development, preview, store artifacts, EAS environments, and device QA, use [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md).
