# LiBot Mobile

LiBot Mobile is the React Native mobile client for the LiBot library robot. It is a public reader experience: users can search books, view library areas, and request LiBot guidance without signing in.

## Features

- Book search and book details
- LiBot guidance from a book to its shelf
- Map view for the reading area and robot position
- TanStack Query for server state management
- Zustand for client UI state and app session state
- React Native Maps for library areas and robot positions
- SignalR integration for robot, mission, and notification events
- React Native Maps integration for route and robot placement views
- Reader-only navigation with mock data ready to be replaced by backend APIs

## Tech Stack

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

## Architecture

The application follows a feature-based structure where each feature owns its API access, types, hooks, and UI pieces. Route files exist only in the app folder and render screen components from the src/screens section.

## Folder Structure

- app/ - Expo Router route tree
- src/core - application providers, config, and shared state
- src/components - reusable user interface components
- src/features - feature packages for books, guidance, and facilities
- src/screens - screen implementations for the reader flow
- src/services - API client, realtime hub client, and secure storage utilities
- src/theme - design tokens
- src/mocks - mock data used until backend APIs are connected
- src/utils - small shared helpers
- docs/ - architecture documentation

## Installation

1. Install dependencies:
   npm install
2. Copy the environment template:
   cp .env.example .env
3. Update environment values if needed.

## Environment Setup

Create a .env file using .env.example:

EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_SIGNALR_URL=http://localhost:5000/hubs
EXPO_PUBLIC_MAP_PROVIDER=google

## Running the Project

npm start
npm run android
npm run ios
npm run web

## Development Commands

npm run lint
npm run format
npm run typecheck
npm test

## API Configuration

The API client is centralized in src/services/api/axiosClient.ts and reads the base URL from EXPO_PUBLIC_API_URL. Requests automatically include the bearer token from the secure store.

## SignalR Configuration

The SignalR hub client is centralized in src/services/realtime/signalRClient.ts and uses EXPO_PUBLIC_SIGNALR_URL for connection setup. Realtime hooks or UI logic should subscribe through the central client, not create multiple independent connections.

## Access Model

The mobile app does not show a login screen and does not require a user role. It is intentionally limited to public reader functions: searching books, viewing book details, requesting robot guidance, and viewing library areas on the map. Librarian workflows belong in the web application.

## Development Guidelines

- Keep route files thin and avoid business logic in app screens.
- Prefer feature modules instead of placing logic inside a single screen.
- Keep server state in TanStack Query and UI state in Zustand.
- Store tokens in Expo Secure Store.
- Use mock data from src/mocks and isolate it from screen logic.

## Documentation

See docs/MOBILE_ARCHITECTURE.md for the detailed architecture and project conventions.
