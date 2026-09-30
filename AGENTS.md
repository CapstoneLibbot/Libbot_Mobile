This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code outside `app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Responsive UI: mobile and tablet are first-class

Every UI feature and screen must work from a compact phone viewport through tablet portrait and landscape **in its first implementation**. Do not treat tablet support as a later, screen-by-screen retrofit.

- Use the current window's logical dimensions (dp) and safe-area insets; never branch on device model, platform alone, physical pixels, or a hard-coded screen resolution.
- Treat width classes as a shared layout contract: compact `< 600dp`, medium `600–839dp`, expanded `≥ 840dp`. Centralize this logic, responsive spacing/type tokens, and reusable layout primitives in `src/shared`; do not reimplement breakpoints per screen.
- Screens must have one route and one feature composition across size classes. Adapt composition (for example: one/two columns, list/grid, sidebar/drawer, inline/sticky actions), rather than creating duplicate phone and tablet screens or navigation trees.
- Prefer fluid containers (`flex`, `min/maxWidth`, `gap`, `flexWrap`) over fixed widths/heights. Cap readable content width on expanded displays and keep primary actions reachable in both portrait and landscape.
- Support orientation changes without losing input, selected data, scroll position, or active mission/workflow state. Account for safe areas, keyboard overlap, split-screen/resized windows where supported, and text scaling.
- Keep touch targets at least 44 × 44dp and do not rely on hover, mouse, or a particular tablet orientation for a core action.
- For every UI change, verify at minimum: a compact phone portrait width (~360dp), tablet portrait (~768dp), and tablet landscape/expanded (~1024dp). Check loading, empty, error, long localized text, keyboard-visible forms, and active guidance states—not only the happy-path screen.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
