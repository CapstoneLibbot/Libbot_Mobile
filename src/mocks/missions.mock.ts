import {
  GuidanceMission,
  RobotPose,
} from "../features/guidance/types/guidance.types";

/**
 * Primary planned route for LiBot on library map (13.9m x 9.9m).
 * Kiosk / Entrance -> Central Corridor -> Shelf A-12
 */
export const sampleMissionPrimaryPath: RobotPose[] = [
  { x: 2.2, y: 1.8, yaw: 1.57 }, // Kiosk start
  { x: 2.2, y: 4.5, yaw: 0.0 }, // Turn into main corridor
  { x: 5.5, y: 4.5, yaw: 0.0 }, // Current position in transit
  { x: 9.8, y: 4.5, yaw: 1.57 }, // Turn into Bookshelf Row C/A
  { x: 9.8, y: 7.6, yaw: 1.57 }, // Target destination: Shelf A-12
];

/**
 * Alternative detour route used when replanning around an obstacle
 * detected in the central corridor.
 */
export const sampleMissionAlternativePath: RobotPose[] = [
  { x: 2.2, y: 1.8, yaw: 1.57 }, // Kiosk start
  { x: 2.2, y: 4.5, yaw: 0.0 }, // Main corridor
  { x: 5.5, y: 4.5, yaw: -1.57 }, // Turn south to avoid corridor obstacle
  { x: 5.5, y: 2.8, yaw: 0.0 }, // Southern reading area bypass
  { x: 8.5, y: 2.8, yaw: 1.57 }, // Moving past obstacle zone
  { x: 9.8, y: 4.5, yaw: 1.57 }, // Rejoin target aisle
  { x: 9.8, y: 7.6, yaw: 1.57 }, // Destination: Shelf A-12
];

export const sampleMissionTemplate: Omit<
  GuidanceMission,
  "id" | "bookId" | "createdAt" | "updatedAt"
> = {
  robotId: "LiBot-01",
  status: "active",
  progress: 45,
  currentPose: { x: 5.5, y: 4.5, yaw: 0.0 },
  destination: { x: 9.8, y: 7.6, yaw: 1.57 },
  path: sampleMissionPrimaryPath,
  mapVersion: "library-l1-v1",
  routeRevision: 1,
};
