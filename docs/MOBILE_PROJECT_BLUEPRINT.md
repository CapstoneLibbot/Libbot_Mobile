# LiBot Mobile kiosk blueprint

## Purpose

LiBot Mobile is the public-facing screen on a library robot. It helps visitors find books and facilities and follow a robot guidance mission. The mobile client renders backend workflow state; it does not decide robot dispatch or send ROS2 commands.

## Supported route map

| Route | Responsibility |
| --- | --- |
| `/` | Redirect to kiosk idle state |
| `/(kiosk)/idle` | Attract screen and entry into search/facility discovery |
| `/(kiosk)/search` | Book search and category filtering |
| `/(kiosk)/catalog/[bookId]` | Book details, shelf/location, start guidance |
| `/(kiosk)/facilities` | Facility/area search |
| `/(kiosk)/facilities/[facilityId]` | Facility details, map/location, start guidance |
| `/(kiosk)/guidance/[missionId]` | Mission progress and robot guidance presentation |
| `/(kiosk)/feedback/[missionId]` | Visitor rating and return to idle |

No auth, reader, librarian, inventory, patrol, notifications, profile, or robot-control routes are part of this mobile kiosk release.

## Workflow 1: book search and guidance

1. At idle, the visitor starts book search.
2. The app searches title, author, ISBN, or category and shows results.
3. The visitor opens book details, sees availability and location, then either returns, opens the location, or starts guidance.
4. The backend creates and owns the guidance mission; the client navigates to the mission route and renders status/path updates.
5. On arrival or completion, the visitor can submit feedback and the app returns to idle.

Unavailable books must not start a guidance mission. Search, detail, and mission errors show recoverable error states rather than breaking kiosk navigation.

## Workflow 2: facility search and guidance

1. At idle, the visitor starts facility discovery.
2. The app searches library areas/facilities and opens a selected detail page.
3. The visitor views the highlighted location or starts guidance.
4. The backend owns mission execution; the client observes it on the guidance route.
5. Arrival follows the same feedback-to-idle completion path.

## State ownership

| State | Owner |
| --- | --- |
| Search/detail/facility/mission server data | TanStack Query |
| Kiosk presentation, inactivity, active mission ID | Zustand |
| Mission/robot realtime connection | Central SignalR client |
| Robot dispatch, workflow evaluation, ROS2, persistence | Backend/robot stack |

## Resilience rules

- Idle timeout returns to idle only when no mission needs active attention.
- On offline search/detail requests, show a retryable offline state.
- During guidance, keep the last valid mission snapshot, reconnect SignalR, and refetch server state when connectivity returns.
- Ignore malformed realtime payloads safely and retain a usable kiosk screen.
- Do not duplicate or independently create backend workflow state from the UI.

## Responsive and orientation behavior

The kiosk route runs in landscape. UI still uses one responsive composition: compact below 600dp, medium 600–839dp, expanded from 840dp. Future non-kiosk routes must remain adaptive on phone/tablet portrait and landscape. Preserve mission and input state across window-size or orientation changes.

## Related documentation

- [Architecture and technical boundaries](MOBILE_ARCHITECTURE.md)
- [Refactor implementation specification](REFACTOR_SPEC.md)
- [Build and release workflow](BUILD_AND_RELEASE.md)
