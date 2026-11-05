import type { RobotPose } from "../types/guidance.types";

/** Returns the length, in metres, of the robot's planned route. */
export function getRouteDistanceMeters(route: readonly RobotPose[]): number {
  return route.slice(1).reduce((distance, point, index) => {
    const previousPoint = route[index];
    const segment = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);

    return Number.isFinite(segment) ? distance + segment : distance;
  }, 0);
}

export function formatRouteDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return "—";

  if (distanceMeters >= 1_000) {
    return `${(distanceMeters / 1_000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

export function formatBatteryLevel(battery: number | null | undefined): string {
  if (battery == null || !Number.isFinite(battery)) return "—";

  return `${Math.round(Math.min(100, Math.max(0, battery)))}%`;
}
