# Backend integration reference

## Current status

Only the catalog read flow is connected to the existing `Libbot_BE` backend. The app uses mock repositories for facilities, guidance, and feedback. Do not describe those feature flows as production-integrated.

| Capability | Status | Mobile backend route |
| --- | --- | --- |
| Search books | Integrated | `GET /api/book-guidance/search` |
| Book details | Integrated | `GET /api/book-guidance/books/{bookId}` |
| Book categories | Integrated | `GET /api/book-categories` |
| Facilities | Mock only | Not yet connected |
| Start/cancel guidance | Mock only | Not yet connected |
| Feedback | Mock only | Not yet connected |
| Robot heartbeat | Service available, not consumed by a screen | SignalR `/robotHub`, `ReceiveHeartbeat` |

## Configuration

The current catalog integration reads these public Expo variables:

```dotenv
# Required to enable HTTP catalog integration. Includes /api and no trailing slash.
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.8:5205/api

# Optional until a screen consumes robot heartbeat.
EXPO_PUBLIC_SIGNALR_URL=http://192.168.1.8:5205/robotHub
```

For a physical Android or iOS device, replace `192.168.1.8` with the LAN address of the machine running `LiBot.Api`. Do not use `localhost`; it refers to the device itself. Preview and production builds must use an HTTPS address reachable by the device.

When `EXPO_PUBLIC_API_BASE_URL` is absent in development or test, the catalog composition selects the existing mock repository. Production builds reject a missing or malformed API base URL.

All `EXPO_PUBLIC_*` values are embedded in the app binary. They must never contain credentials, tokens, database connection strings, or private keys.

## Catalog request contract

The Axios client has `baseURL = EXPO_PUBLIC_API_BASE_URL`; catalog endpoints therefore use paths relative to `/api`.

### Search

```text
GET /book-guidance/search?query=&category=&matchMode=FUZZY&page=1&pageSize=50
```

`query` and `category` are optional. `matchMode` is `FUZZY` by default. The app maps `books` in the response to its `Book` UI model:

- `bookId` becomes `id`.
- `classification` becomes `category`; missing values display as `Khác`.
- `availableCopies > 0` determines `available`.
- `image` becomes `coverUrl`.

### Detail

```text
GET /book-guidance/books/{bookId}
```

The app maps `location.floorNumber`, `location.shelfName`, and `location.shelfLevel` to the detail presentation. A missing location is treated as unavailable. The endpoint coordinates are indoor map coordinates, not latitude/longitude.

### Categories

```text
GET /book-categories
```

The category list is mapped to names and prepends the UI filter value `All`. If this optional request fails, the app keeps the `All` filter and book search remains available.

## Module boundaries

```text
src/config/env.ts                         public environment validation
src/services/api/client.ts                shared Axios instance
src/services/api/apiError.ts              normalized API errors
src/features/catalog/api/catalog.dto.ts   backend response/request shapes
src/features/catalog/api/catalog.mapper.ts DTO-to-Book mapping
src/features/catalog/api/catalog.api.ts   catalog requests and HTTP repository
```

Screens and hooks do not call Axios directly. New API work should follow the same feature-local `api/` layout rather than adding endpoint strings to a global registry.

## Current limitations and next steps

- The backend SignalR hub currently publishes `ReceiveHeartbeat`; it does not provide mission progress, robot pose, or route events for mobile.
- Guidance integration should first add feature-local DTO/API/mapper modules for `book-guidance/start`, execution polling, and `missions/{id}/cancel`, while keeping backend routes unchanged.
- Facility and feedback integrations should follow after guidance has a stable mission context.
- Do not migrate old `src/platform/http` or `src/platform/realtime` consumers piecemeal without removing their duplicated configuration source in the same change.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `git diff --check` after an integration change.

For device verification, start `LiBot.Api` on the LAN host, set `EXPO_PUBLIC_API_BASE_URL`, restart Metro, then test catalog search, a successful detail response, an empty result, a missing book, and an unavailable book.
