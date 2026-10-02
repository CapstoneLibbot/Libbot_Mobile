# LiBot Mobile refactor specification

## Purpose and non-goals

This document is the implementation contract for the structural refactor of LiBot Mobile. The refactor must preserve every current kiosk route and user-visible behavior while making ownership and dependencies explicit. It does **not** add new product workflows, change backend contracts, add dependencies, or edit generated native projects.

The current application is already feature-first in many places. The target is therefore a boundary cleanup, not a wholesale rewrite into a generic template.

## Current-state audit

The checked-in route tree is:

```
app/
  _layout.tsx
  index.tsx
  (kiosk)/
    _layout.tsx
    idle.tsx
    search.tsx
    catalog/[bookId].tsx
    facilities/index.tsx
    facilities/[facilityId].tsx
    guidance/[missionId].tsx
    feedback/[missionId].tsx
```

`src/features` currently owns the kiosk domains (`catalog`, `facilities`, `guidance`, `feedback`, and `idle`); `src/shared` owns UI and responsive primitives; `src/infrastructure` contains HTTP, SignalR, storage, network, and repository implementations. This is a good starting point, but it has these concrete boundary problems:

1. `src/core/config/env.ts` and `src/core/config/appConfig.ts` duplicate public environment values.
2. Feature hooks depend on globally selected repositories. Repository interfaces, mock implementations, and future HTTP implementations are not separated by a composition boundary.
3. Feature screen components call `expo-router` directly. The route layer cannot be tested or changed independently of feature presentation.
4. `src/mocks` is imported by production-facing repository code, and a shared UI test imports feature mock data. Shared code must remain domain-neutral.
5. Relative imports cross several folders and public `index.ts` files expose implementation details by default.
6. Existing older documentation mentions paths and flows that are not in this repository, including `src/services`, `src/screens`, `(reader)`, auth, and librarian routes.

## Target structure

```
app/                              # Expo Router adapters only
  _layout.tsx
  index.tsx
  (kiosk)/...
src/
  app/                             # application bootstrap and policies
    config/                        # one validated runtime configuration
    providers/                     # Query and app provider composition
    state/                         # kiosk session/UI state and query keys
    orientation/                   # route-level kiosk orientation policy
  features/                        # catalog, facilities, guidance, feedback, idle
  platform/                        # domain-agnostic device/network adapters
    http/
    realtime/
    storage/
    network/
  shared/                          # domain-agnostic reusable code only
    ui/
    theme/
    layout/
    lib/
    types/
  testing/                         # fixtures, fakes, and test utilities
```

The target names describe responsibility, not a mandate to create empty folders. Create a folder only when it has owned code.

### Ownership and dependency rules

| Layer | Owns | May import | Must not import |
| --- | --- | --- | --- |
| `app/` routes | Router params, navigation adapters, layouts | `src/core`, feature public APIs, Expo Router | feature internals, platform implementations |
| `src/core` | bootstrap, provider composition, config, UI session state | features, platform, shared | route files |
| `features/*` | one business capability, feature models, endpoint mapping, hooks, UI | core public state/config, platform, shared | another feature internals, test fixtures |
| `platform` | Axios base client, SignalR lifecycle, NetInfo, secure storage | core config, shared | features and route files |
| `shared` | generic UI, design tokens, responsive helpers, pure utilities | React/React Native and other shared modules | core, platform, feature, mock imports |
| `testing` | fixtures, fakes, render helpers | public APIs from all layers | production imports from `testing` |

Use TypeScript aliases for each root (`@/core`, `@/features`, `@/platform`, `@/shared`, and `@/testing`). Add matching TypeScript, Babel/Metro when needed, and ESLint import-boundary configuration in the same migration phase. After aliases exist, new deep relative imports across layer boundaries are not allowed. Relative imports remain acceptable inside a single feature.

Each feature exposes only an intentional public API from its top-level `index.ts`. Routes import page contracts from this public API; other features do not import a sibling feature's files. Shared barrel exports are limited to stable primitives; do not create a global barrel that re-exports every feature.

## Route and feature contract

Each `app/` file is an adapter. It reads typed local search parameters, obtains the navigation methods it needs, and renders a feature page with explicit input and output callbacks. A feature page may render loading, empty, error, and content states, but must not call `router`, `useLocalSearchParams`, or construct kiosk URLs itself.

For example, the catalog detail route owns `bookId` parsing and the actions `back`, `openFacility(facilityId)`, and `startGuidance(missionId)`. The catalog page owns fetching the book and emitting these semantic callbacks. This keeps Expo Router-specific behavior at the edge and makes page behavior unit-testable.

Keep route paths and route parameter names unchanged during this refactor.

## Data, state, and platform rules

- Keep TanStack Query for server state: search results, details, facilities, missions, and feedback mutation results. Query keys live in `src/core/state`.
- Keep Zustand for kiosk-only UI/session state: idle interaction, active mission identifier, and transient presentation state. Do not mirror query data in the store.
- Define feature repository/transport contracts next to the feature model. Feature API adapters may use the generic platform HTTP client; platform code never imports feature types.
- Create mock adapters under `src/testing` and select adapters only in app-level composition. Production module paths must not import fixture data.
- Keep one SignalR connection lifecycle in `platform/realtime`. Feature hooks subscribe through typed public events and always unregister on unmount or mission change.
- Replace the two runtime config files with one Zod-validated config module. `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SIGNALR_URL`, and `EXPO_PUBLIC_MAP_PROVIDER` remain public build-time values. Missing or invalid values must produce a safe, diagnosable startup state rather than silently selecting an unintended production endpoint.

## Orientation and responsive policy

The app must not use a global landscape lock. The `(kiosk)` layout requests landscape through `expo-screen-orientation` while active; outside kiosk routes, the app follows device orientation. All UI uses logical width classes: compact below 600dp, medium 600–839dp, and expanded from 840dp.

Do not branch on device model, physical pixels, or platform alone. Preserve input, selected item, scroll context, and active mission when orientation or window size changes. Maintain 44×44dp touch targets and safe-area/keyboard accessibility.

## Migration plan

Every phase must be an independently buildable commit/PR. Run the validation command below before merging a phase. Do not combine cleanup with behavior changes.

1. **Baseline and guardrails** — record current routes/tests, add aliases and import-boundary rules without moving behavior, and add tests for the route adapter contracts that will be introduced.
2. **Application foundation** — move providers, store, query keys, idle policy, and the single validated config into `src/core` (avoiding the reserved `src/app` path); delete duplicate config only after every consumer is migrated.
3. **Platform and test seam** — move HTTP, realtime, storage, and network to `src/platform`; move mocks/fixtures to `src/testing`; introduce app-level adapter composition. Preserve mock behavior as the default until real backend adapters are explicitly enabled.
4. **Feature slices** — migrate one feature at a time in this order: `catalog`, `facilities`, `guidance`, `feedback`, `idle`. For each feature, move model, data adapter, hooks, and UI; convert navigation to callbacks; update route adapter; then migrate its tests.
5. **Shared cleanup** — move responsive helpers into `shared/layout`, generic utilities into `shared/lib`, and remove every feature/mock dependency from `shared`. Keep component behavior and visual tokens unchanged.
6. **Removal and documentation** — remove empty legacy folders and unused barrel exports only after `rg` finds no references. Update the architecture document to the final, not intermediate, tree.

### Rollback rules

- If a migrated feature changes route behavior, reverts a mission/feedback flow, or causes a validation failure, revert that feature slice only; keep completed preceding phases.
- Do not delete an old module until all imports are changed and its replacement tests are green.
- Do not refactor generated `ios/` or `android/` folders. This project uses Continuous Native Generation.

## Required validation

Run after every phase and before a preview build:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
```

The initial baseline is 103 passing unit tests. Preserve or replace every test with equivalent coverage. Add tests for config validation, app composition, route parameter/callback adapters, repository mapping, SignalR subscription cleanup, and import boundaries.

Perform manual device verification at roughly 360dp portrait, 768dp portrait, and 1024dp landscape. Cover loading, empty, error, long Vietnamese text, keyboard-visible forms, offline/reconnect, orientation change, and an active guidance mission.

## Completion criteria

The refactor is complete only when all route files are thin adapters; feature UI has no Expo Router calls; production code has no mock imports; runtime config is single-source and validated; layer boundaries are enforced; legacy paths have no references; all validation is green; and the documented route tree exactly matches the repository.
