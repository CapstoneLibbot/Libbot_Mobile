# LiBot Mobile

LiBot Mobile is an Expo/React Native kiosk client for a library robot. Visitors can search books or facilities, view locations, start a guidance mission, and submit feedback. It is a public reader experience; robot control and librarian workflows belong to backend/admin systems.

## Current structure

```
app/                    Thin Expo Router adapters (layouts, param parsing, callbacks)
src/config/             Environment validation and mock/API mode selection
src/core/               Providers, kiosk state, orientation, and repository composition
src/features/           Feature UI, hooks, domain types, and feature-owned API modules
src/services/           Shared Axios client, API-error mapping, and SignalR service
src/platform/           Legacy platform adapters plus storage and network status
src/shared/             Domain-neutral UI, theme tokens, layout primitives, lib, types
src/testing/            Fixtures, fakes, route contracts, and testing utilities
docs/                   Product, architecture, refactor, and release documents
```

The catalog feature is integrated with the current backend; facilities, guidance, feedback, and the legacy platform adapters remain mock-first. See [the integration reference](docs/INTEGRATION.md) for the active API contract and rollout status.

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
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-host>:5205/api
EXPO_PUBLIC_SIGNALR_URL=http://<your-lan-host>:5205/robotHub
EXPO_PUBLIC_MAP_PROVIDER=google
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

Do not put credentials or secrets in `EXPO_PUBLIC_*` variables; they are visible inside the compiled app.

### Xiaozhi voice (Android development/EAS build)

The kiosk enables the Xiaozhi transport only when both public, LAN-only values
are configured. They identify the server and kiosk; neither is a secret.

```dotenv
EXPO_PUBLIC_XIAOZHI_WS_URL=ws://192.168.100.43:8000/xiaozhi/v1/
EXPO_PUBLIC_VOICE_KIOSK_ID=libot-kiosk-01
```

Do not use `localhost` for an Android device. The native `xiaozhi-audio` module
uses Android `SpeechRecognizer` and Android Text-to-Speech with `vi-VN`, so it
requires a development build or EAS APK; Expo Go cannot load it. Build locally
with `npx expo run:android` or create the configured EAS build. The DeepSeek key
and MCP bearer token stay on the Xiaozhi/BE hosts and must never be added to
these public variables.

## Documentation

- [Team setup: Backend, Xiaozhi voice, Mobile and Android APK](docs/TEAM_SETUP_VOICE.md)
- [Hướng dẫn build file APK cài máy Android](docs/HUONG_DAN_BUILD_APK.md)
- [Architecture: current state and target](docs/MOBILE_ARCHITECTURE.md)
- [Detailed refactor specification for agents](docs/REFACTOR_SPEC.md)
- [Build and release runbook](docs/BUILD_AND_RELEASE.md)
- [Kiosk product and workflow blueprint](docs/MOBILE_PROJECT_BLUEPRINT.md)
- [Navigation map / costmap guide](docs/NAVIGATION_MAP_COSTMAP_GUIDE.md)
- [Backend integration reference and current status](docs/INTEGRATION.md)
