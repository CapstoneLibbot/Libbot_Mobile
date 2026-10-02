# LiBot Mobile

LiBot Mobile is an Expo/React Native kiosk client for a library robot. Visitors can search books or facilities, view locations, start a guidance mission, and submit feedback. It is a public reader experience; robot control and librarian workflows belong to backend/admin systems.

## Current structure

```
app/                    Thin Expo Router adapters (layouts, param parsing, callbacks)
src/core/               Runtime config, providers, kiosk state, orientation, composition
src/features/           Feature presentation and hooks (catalog, facilities, guidance, feedback, idle)
src/platform/           HTTP client, SignalR realtime lifecycle, secure storage, network status
src/shared/             Domain-neutral UI, theme tokens, layout primitives, lib, types
src/testing/            Fixtures, fakes, route contracts, and testing utilities
docs/                   Product, architecture, refactor, and release documents
```

The current structure is documented before a planned deep refactor. Read [the architecture guide](docs/MOBILE_ARCHITECTURE.md) for the current and target boundaries, and [the refactor specification](docs/REFACTOR_SPEC.md) before changing module ownership.

## Setup and development

This repository uses npm (`package-lock.json` is checked in).

```bash
npm ci
cp .env.example .env
npm run start
```

Use `npm run dev` with an installed Expo development build for real-device work. Expo Go is suitable only for quick experiments with its bundled native modules.

```bash
npm run start       # Expo Go
npm run dev         # Expo development client
npm run android     # local Android native build/run
npm run ios         # local iOS native build/run
npm run typecheck
npm run lint
npm test
npm run validate
npm run build:apk:local # build Android APK locally on Mac
npm run build:apk       # build Android APK via EAS Cloud
```

## Environment variables

Copy `.env.example` and set public client values:

```dotenv
EXPO_PUBLIC_API_URL=http://<your-lan-host>:5000/api
EXPO_PUBLIC_SIGNALR_URL=http://<your-lan-host>:5000/hubs
EXPO_PUBLIC_MAP_PROVIDER=google
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

Do not put credentials or secrets in `EXPO_PUBLIC_*` variables; they are visible inside the compiled app.

## Documentation

- [Hướng dẫn build file APK cài máy Android](docs/HUONG_DAN_BUILD_APK.md)
- [Architecture: current state and target](docs/MOBILE_ARCHITECTURE.md)
- [Detailed refactor specification for agents](docs/REFACTOR_SPEC.md)
- [Build and release runbook](docs/BUILD_AND_RELEASE.md)
- [Kiosk product and workflow blueprint](docs/MOBILE_PROJECT_BLUEPRINT.md)
- [Navigation map / costmap guide](docs/NAVIGATION_MAP_COSTMAP_GUIDE.md)
