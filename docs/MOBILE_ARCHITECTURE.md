# LiBot Mobile Architecture

## 1. Project Overview

LiBot Mobile is the React Native client for the LiBot capstone project. The mobile app provides public reader workflows for book search, robot guidance, and library-area maps. It does not control robot hardware or connect directly to ROS2.

The mobile app communicates with the ASP.NET Core backend over REST APIs and receives realtime updates from SignalR. The backend then coordinates missions and dispatch with the robot stack.

## 2. Technology Stack

- React Native
- TypeScript
- Expo
- Expo Router
- TanStack Query
- Zustand
- Axios
- @microsoft/signalr
- React Native Maps
- Expo Secure Store
- React Hook Form
- Zod

## 3. Architecture Overview

The application uses a feature-based architecture with clear responsibility boundaries.

┌───────────────────────────────┐
│ React Native App │
├───────────────────────────────┤
│ Expo Router │
│ Reader Screens │
│ Features │
│ Components │
├───────────────────────────────┤
│ TanStack Query │
│ Zustand │
├───────────────────────────────┤
│ Axios │
│ SignalR │
├───────────────────────────────┤
│ ASP.NET Core Backend │
│ Book / Mission / Map APIs │
└───────────────────────────────┘

Mobile -> REST API -> Backend -> Workflow / Mission / Dispatch -> Robot
Backend -> SignalR -> Mobile

## 4. Folder Structure

The app structure created for this project is:

```
libot-mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (reader)/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── search.tsx
│   │   ├── facility/[facilityId].tsx
│   │   ├── book/[bookId].tsx
│   │   ├── facility/[facilityId].tsx
│   │   └── guidance/[missionId].tsx
│   │   └── guidance/[missionId].tsx
├── src/
│   ├── core/
│   │   ├── config/
│   │   ├── providers/
│   │   └── store/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── books/
│   │   ├── guidance/
│   │   ├── facilities/
│   │   ├── notifications/
│   │   ├── rating/
│   │   ├── tasks/
│   │   ├── robot-monitoring/
│   │   ├── inventory/
│   │   └── misplaced-books/
│   ├── screens/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── constants/
│   ├── utils/
│   ├── theme/
│   ├── mocks/
│   └── index.ts
├── docs/
│   └── MOBILE_ARCHITECTURE.md
├── README.md
├── app.json
├── .env.example
├── babel.config.js
├── .gitignore
├── package.json
└── tsconfig.json
```

## 5. Responsibility of Every Major Folder

### app/

The app directory is reserved for routing only. It contains routes, layouts, and screen entrypoints. Business logic stays outside this folder.

### src/core/

This folder contains app-level configuration, secure runtime data, and provider composition.

### src/components/

Reusable UI components shared across the app: common controls, map widgets, robot status helpers, and layout wrappers.

### src/features/

Each feature owns API access, types, hooks, and component data related to that business domain.

### src/screens/

Screens are composed with feature components and are kept free of backend logic.

### src/services/

API, secure storage, and realtime infrastructure live here.

### src/theme/

Centralized color, spacing, and typography tokens.

### src/mocks/

Mock data used during early project development and can be swapped for real backend calls later.

## 6. Responsibility of Every Feature

### books

Book search, book details, shelf information, and availability queries.

### guidance

Robot guidance mission lifecycle, progress, destination, and realtime tracking state.

### facilities

Facility metadata and information screens.

### facilities

Library areas such as the reading zone and their map locations.

## 7. Expo Router Architecture

Expo Router is used for navigation. Route files live in the app folder and remain thin wrappers that render screen components. This keeps the navigation layer separate from business logic.

Reader flow:

- / (redirect)
- /(auth)/login
- /(reader)/home
- /(reader)/search
- /(reader)/book/[bookId]
- /(reader)/facility/[facilityId]
- /(reader)/guidance/[missionId]
- /(reader)/notifications
- /(reader)/profile

Librarian flow:

- /(librarian)/dashboard
- /(librarian)/tasks
- /(librarian)/robots
- /(librarian)/alerts
- /(librarian)/inventory
- /(librarian)/misplaced-books
- /(librarian)/profile

## 8. Screen Architecture

The actual screen implementation is found in src/screens/

- auth/LoginScreen.tsx
- reader/ReaderHomeScreen.tsx
- reader/SearchScreen.tsx
- reader/BookDetailScreen.tsx
- reader/GuidanceScreen.tsx
- reader/NotificationsScreen.tsx
- reader/ReaderProfileScreen.tsx
- librarian/LibrarianDashboardScreen.tsx
- librarian/TaskListScreen.tsx
- librarian/TaskDetailScreen.tsx
- librarian/RobotMonitoringScreen.tsx
- librarian/AlertsScreen.tsx
- librarian/InventoryScreen.tsx
- librarian/MisplacedBooksScreen.tsx
- librarian/LibrarianProfileScreen.tsx

These screens consume real or mock data through feature hooks and APIs, then render reusable cards and controls.

## 8.1 Responsive Screen Contract

Each screen is implemented once and adapts its composition to the available logical window width (dp), including safe-area insets and orientation changes. The shared layout layer owns the breakpoints and responsive tokens:

| Class    | Window width | Expected composition                                                        |
| -------- | ------------ | --------------------------------------------------------------------------- |
| Compact  | `< 600dp`    | Single-column content, stacked actions, list-first presentation.            |
| Medium   | `600–839dp`  | One primary flow; two columns only where both remain readable.              |
| Expanded | `≥ 840dp`    | Centered/max-width content and optional two-pane detail/map or grid layout. |

Feature screens must consume common responsive layout primitives from `src/shared`; they must not duplicate a phone route, tablet route, or per-screen breakpoint implementation. Fixed viewport dimensions are prohibited except where a visual asset has an explicit aspect ratio. Layouts use fluid flex sizing, min/max constraints, wrapping, scrolling and safe-area-aware padding.

Responsive QA is part of a screen's definition of done: verify phone portrait (~360dp), tablet portrait (~768dp), and tablet landscape (~1024dp), including keyboard-visible inputs, text scaling, loading/empty/error states, long Vietnamese content, and preserving workflow state during rotation or resize.

## 9. API Architecture

The app uses a centralized Axios client at src/services/api/axiosClient.ts.

Responsibilities:

- Reads base URL from environment variables
- Adds Authorization header when a token exists
- Handles 401 responses by clearing the session
- Applies JSON defaults and timeouts
- Centralizes request and response errors

The flow is:

Mobile -> Axios -> ASP.NET Core API -> DTOs -> UI -> TanStack Query

## 10. Authentication Architecture

Authentication is handled with:

- Expo Secure Store for token persistence
- Zustand store for session visibility in the app
- AuthProvider for restoring a session at startup

Session data is stored with the secure storage service and restored on app launch. Reader and librarian roles are routed accordingly.

### Role-based access

- READER -> reader screens
- LIBRARIAN -> librarian screens
- ADMIN -> blocked or redirected to the web / admin message pattern

## 11. TanStack Query Architecture

Server state is managed by TanStack Query. This keeps station data, book search results, and similar API responses out of Zustand. The current implementation includes book queries such as useBooks and useBook.

## 12. Zustand Architecture

Zustand manages client-side properties such as:

- authenticated user
- selected role
- selected robot
- active mission ID
- map UI state

This state is defined in src/core/store/appStore.ts.

## 13. SignalR Architecture

The app uses a central SignalR client at src/services/realtime/signalRClient.ts. This avoids creating multiple hub connections across UI components. The client exposes the hub connection and event subscriptions for:

- RobotPositionUpdated
- RobotStatusChanged
- RobotBatteryUpdated
- RobotConnectionChanged
- MissionStatusChanged
- MissionStepChanged
- NotificationCreated

## 14. Map Architecture

The app includes reusable map widgets under src/components/map and uses React Native Maps as the map abstraction. The map layer is intentionally separated from business logic and is ready to show route, destination, robot pose, and mission state.

## 15. Reader Workflow

Reader workflow implemented in this project:

Search Book -> Book Detail -> Book Location -> Request Guidance -> Create Guidance Mission -> Robot Assigned -> Realtime Tracking -> Completion -> Rating

Current screens support the first steps of that flow with mock data and route navigation.

## 16. Librarian Workflow

Librarian workflow implemented in this project:

Dashboard -> Tasks -> Task Detail -> Robot Assignment -> Monitor Execution -> Completed / Alert -> View Result

Screen coverage includes dashboard, tasks, robot monitoring, alerts, inventory, and misplaced books views.

## 17. Data Flow

The app uses a layered flow:

1. Screens call feature hooks or services.
2. Hooks use TanStack Query or direct app services.
3. API layer delivers backend responses through Axios.
4. UI renders domain data from the response.
5. Zustand tracks selected state and session information.

## 18. Realtime Data Flow

The realtime flow is:

Backend -> SignalR Hub -> signalRClient -> feature realtime hook -> UI update

The central client ensures event subscriptions are centralized and predictable.

## 19. Role-Based Access

The mobile app supports the reader and librarian roles. Role selection occurs during login through the auth screen, and the app redirects based on the selected or restored user role.

## 20. Mock Data Strategy

Mock data is isolated under src/mocks and mirrors expected data shapes for the feature domain. This includes arrays for books, missions, robots, tasks, and notifications. The data is intentionally easy to replace with backend responses later.

## 21. Error Handling Strategy

The app includes reusable empty, loading, and error states through common components. Screens check for loading and failure states before rendering data-driven content. API errors are centralized in the Axios client and surfaced through the UI.

## 22. Naming Conventions

- Components: PascalCase
- Functions and variables: camelCase
- Types and interfaces: PascalCase
- Route files: kebab-case / dynamic route segments as needed

## 23. Coding Conventions

- Feature-based architecture
- Thin route files
- Reusable UI components
- Strong TypeScript typing
- No direct ROS2 or hardware logic in the mobile app
- No hardcoded production URLs in source files
- Centralized services and utilities

## 24. How to Add a New Feature

1. Create a new folder under src/features/
2. Add types, API, hooks, and components under that feature
3. Export the feature from an index.ts file
4. Compose the final screen from the feature modules
5. Add route navigation if the feature requires a screen

## 25. How to Add a New API

1. Add the endpoint function in a feature-specific api folder
2. Connect it with central Axios client methods
3. Create a TanStack Query hook for the data
4. Bind the hook to the relevant screen or component

## 26. How to Add a New Screen

1. Create the screen inside src/screens/
2. Add the route file in app/
3. Keep the route file thin and render the screen
4. Reuse common components and feature data modules

## 27. How to Add a New Realtime Event

1. Extend the event union in src/services/realtime/realtimeEvents.ts
2. Add the payload shape in the event map
3. Register the event in the SignalR client subscription logic
4. Subscribe from a feature-level realtime hook or screen data provider

## 28. How Mobile Communicates with Backend

The mobile app communicates through REST endpoints using the centralized Axios client, and receives realtime updates through SignalR. The mobile app never directly touches robot control or ROS2.

## 29. What Mobile Must Not Do

- Do not connect directly to ROS2
- Do not control robot hardware
- Do not mix UI, API, and realtime logic inside route files
- Do not hardcode production API URLs
- Do not use Zustand as a replacement for server-state caching

## 30. Future Extension Points

- Add role-aware auth guards and permissions checks
- Replace mock data with real backend responses
- Add deeper map route rendering with serialized backend waypoints
- Add more task status and alert monitoring panels
- Add camera or RFID integration metadata later
- Add multilingual or accessibility improvements
