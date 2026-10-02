# LiBot Mobile architecture

## Product boundary

LiBot Mobile is the public kiosk client for a library robot. It supports two visitor workflows: find a book and request guidance to its shelf; find a facility/area and request guidance to it. It communicates with the backend by REST and receives mission/robot updates through SignalR. It never controls ROS2 or robot hardware directly.

## Implemented architecture
 
The codebase has been refactored into clean architectural layers with enforced import boundaries:
 
- `app/`: Thin Expo Router adapters for routing, layouts, and parameter parsing. Screens are pure UI components driven by explicit input props and output navigation callbacks; feature components never call `router` or `useLocalSearchParams`.
- `src/core/`: Application runtime configuration (single Zod-validated source), providers (`AppProviders`, `QueryProvider`), kiosk session state (`kioskStore`), server-state query keys (`queryKeys`), orientation policy (`useKioskOrientation` - scoped to kiosk layout only), idle policy (`useIdleTimeout`), and adapter composition (`repositories.ts`).
  > **Critical Expo Router Rule:** Never name this directory `src/app/`. In Expo Router, if `src/app/` exists, Expo Router automatically overrides the root `app/` directory and treats `src/app/` as the route tree. That causes non-route foundation code, tests, and stores to be registered as routes, crashing the app at launch.
- `src/features/`: Feature slices (`catalog`, `facilities`, `guidance`, `feedback`, `idle`). Each slice owns its domain models, repository interfaces, custom hooks, and presentation screens/components. Features do not cross-import sibling feature internals.
- `src/platform/`: Domain-neutral platform abstractions for HTTP (`axiosClient`), SignalR realtime lifecycle & typed events (`signalRClient`, `realtimeEvents`), secure key-value storage (`secureStorage`), and network connectivity (`useNetworkStatus`). Platform code never imports feature types.
- `src/shared/`: Domain-neutral design system and utilities.
  - `src/shared/ui/`: Pure presentation primitives (`AppButton`, `AppCard`, `AppHeader`, `AppInput`, `AppText`, `StatusBadge`, `IndoorMap`, etc.).
  - `src/shared/theme/`: Visual design tokens, colors, typography, spacing, radius, shadows.
  - `src/shared/layout/`: Responsive width classes (compact `<600dp`, medium `600–839dp`, expanded `≥840dp`), layout tokens, and `useResponsiveLayout`.
  - `src/shared/lib/`: Generic math, date, string formatting, and coordinate projection utilities (`indoorMapTransform`, `dateUtils`, `formatUtils`, `mapUtils`, `useDebounce`).
  - `src/shared/types/`: Domain-neutral TypeScript contracts.
- `src/testing/`: Testing fixtures (`booksFixture`, `facilitiesFixture`, `missionsFixture`), fake repositories (`mock*Repository`), and route contract test suites. Production code is strictly blocked by ESLint boundary rules from importing anything in `src/testing`.

Dependencies flow strictly inward: `app/` → `src/core/` → `src/features/` → `src/platform/` → `src/shared/`.
Shared and platform modules never import feature modules or routes. Production code never imports test fixtures.

## Runtime configuration and network

The present app reads `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SIGNALR_URL`, and `EXPO_PUBLIC_MAP_PROVIDER`. These are public build-time values and cannot contain secrets. The refactor will replace duplicate config modules with one validated runtime config and choose mock versus network adapters from application-level composition.

REST goes through the Axios client. SignalR has one lifecycle owner; screen or feature code must subscribe through typed events and release subscriptions when the active mission changes or the UI unmounts. Network loss during guidance keeps the last safe snapshot, reconnects, then refetches mission state.

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
