# Build and release guide

## Scope

LiBot Mobile uses Expo SDK 57, npm, Expo Router, and Continuous Native Generation (CNG). Use `npx` commands in this repository because it has `package-lock.json` and no Bun lockfile. Native `ios/` and `android/` folders are generated on demand and must not be created or edited by hand.

This guide documents the intended release workflow. It does not change the current `app.config.ts` or `eas.json`; an implementation agent must apply the configuration work described here in a dedicated build-setup change.

## Build types

| Type | Audience and purpose | Native artifact | How it runs |
| --- | --- | --- | --- |
| Expo Go | Short-lived UI experimentation | Expo Go app, not LiBot binary | `npm run start`; only supported bundled native modules |
| Development build | Developers testing native configuration and real devices | Debug/internal LiBot binary with `expo-dev-client` | Install once, then `npm run dev` for TypeScript/JS changes |
| Preview | QA, demo, and stakeholder validation against staging | Android APK; iOS TestFlight build | Standalone release-like app, no developer tools |
| Production | Store submission and public release | Android AAB; iOS store archive | Google Play and App Store/TestFlight channels |

A development build must be rebuilt only after native dependency changes, Expo SDK upgrades, or `app.config.ts` changes. Ordinary TypeScript/JavaScript changes use Metro and do not require a new binary.

## Prerequisites and ownership

Before the first EAS build, the release owner must provide an Expo account/organization that owns the EAS project, Apple Developer Program and App Store Connect access, Google Play Console access, confirmed ownership of `com.libot.mobile`, and development/staging/production backend URLs reachable from physical devices.

Run EAS setup from the project root with the approved release account:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

The setup implementation must record the EAS project ID in the Expo config, configure `appVersionSource` as `remote`, and let EAS manage Android signing and Apple credentials. Never commit keystores, provisioning profiles, Apple keys, or service-account files.

## Environments and public configuration

| EAS environment | Backend purpose | Expected client values |
| --- | --- | --- |
| `development` | Developer-accessible API; use a LAN host, not `localhost`, for a real device | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SIGNALR_URL`, `EXPO_PUBLIC_MAP_PROVIDER` |
| `preview` | Shared staging API for APK QA and TestFlight | Same variables, pointing to staging |
| `production` | Public production API | Same variables, pointing to production |

All `EXPO_PUBLIC_*` values are embedded in the client binary and are readable by users. They must contain only non-secret values such as URLs and provider names. Store credentials, API private keys, and server secrets only in EAS secret variables or server-side systems.

Commit `.env.example` with placeholder values. Keep local `.env` files out of Git. In EAS, create project-scoped variables for each environment and attach the matching environment explicitly to each profile. Do not point a cloud build at `localhost` or `127.0.0.1`.

## Required EAS profile design

| Profile | EAS environment | Android output | iOS output | Distribution |
| --- | --- | --- | --- | --- |
| `development` | `development` | Development-client APK | Internal development build | Internal; never store-submit |
| `preview` | `preview` | APK | Release build uploaded to TestFlight | Android internal distribution; iOS TestFlight |
| `production` | `production` | AAB | Store archive/IPA pipeline | Google Play and App Store |

`development` sets `developmentClient: true` and internal distribution. `preview` sets internal distribution and Android `buildType: "apk"`. `production` uses the default Android AAB output and remote auto-incremented native build numbers. Add a production submit profile only after App Store Connect and Play Console access are verified.

## Commands after configuration

### Development

```bash
npm ci
npm run validate
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
npm run dev
```

Install the generated development build from its EAS link. Open it and scan the Metro QR code or connect on the same network. For restrictive networks, use `npx expo start --dev-client --tunnel`.

### Preview QA

```bash
npm run validate
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

Download the Android APK from the EAS build link and install it on the test tablet after permitting the installer source. The iOS artifact is distributed through TestFlight; it is not an APK and cannot be directly sideloaded like Android. Assign the build to internal TestFlight testers, wait for processing, then install through the TestFlight app.

### Production

```bash
npm run validate
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Submit the resulting AAB to the selected Google Play track and the iOS build to App Store Connect/TestFlight only after release-owner approval. Production build numbers are immutable: never reuse an Android version code or iOS build number.

## Pre-build and device QA checklist

- `npm ci` is clean and `npm run validate` passes.
- App name, icons, splash screen, `com.libot.mobile`, version, and build environment are correct.
- Android preview APK installs on the intended physical tablet and does not crash on launch (verified `android.config.googleMaps.apiKey` in `app.config.ts` so `react-native-maps` native module doesn't trigger fatal exception).
- iOS preview is accepted by TestFlight and installs on a registered tester's device.
- Expo Router route root is verified to be `app/` and no `src/app/` folder exists (foundation code lives in `src/core/`).
- For Android device QA with Expo Go: Scan QR code *inside* the Expo Go application (scanning via device camera/browser sends requests without `expo-platform` header and stops Metro).
- API and SignalR use the selected environment; no local-only endpoint is embedded.
- Verify compact phone portrait, tablet portrait, and tablet landscape; verify the kiosk enters landscape, while non-kiosk routes remain adaptive.
- Verify search, details, guidance, feedback, idle timeout, offline/reconnect, long Vietnamese text, safe areas, and keyboard-visible forms.
- Confirm no secret is present in source, `.env.example`, app config, build logs, or an `EXPO_PUBLIC_*` value.

## Submission and rollback

Use staged Play tracks and TestFlight internal testing before public release. Record the Git commit, EAS build URL/ID, app version, native build number, environment, and QA sign-off in the release ticket.

If a preview build fails, fix the source/configuration, run validation again, and create a new build. If a published store version has a defect, halt the rollout or remove it from the testing track, then submit a new build with a higher native build number. Do not attempt to modify a published binary.

EAS Update is intentionally out of scope until the team defines a runtime-version and update-channel policy. Native/config changes always require a new binary.

## Official references

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS build profiles](https://docs.expo.dev/build/eas-json/)
- [Android APK builds](https://docs.expo.dev/build-reference/apk/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/usage/)
