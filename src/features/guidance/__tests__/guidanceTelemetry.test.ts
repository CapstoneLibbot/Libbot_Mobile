import { describe, expect, it } from "vitest";
import {
  formatBatteryLevel,
  formatRouteDistance,
  getRouteDistanceMeters,
} from "../utils/guidanceTelemetry";

describe("guidanceTelemetry", () => {
  it("sums every planned-route segment", () => {
    expect(
      getRouteDistanceMeters([
        { x: 0, y: 0, yaw: 0 },
        { x: 3, y: 4, yaw: 0 },
        { x: 3, y: 8, yaw: 0 },
      ]),
    ).toBe(9);
  });

  it("formats unavailable values safely", () => {
    expect(formatRouteDistance(Number.NaN)).toBe("—");
    expect(formatBatteryLevel(null)).toBe("—");
  });

  it("formats route and battery telemetry for display", () => {
    expect(formatRouteDistance(1_250)).toBe("1.3 km");
    expect(formatBatteryLevel(87.6)).toBe("88%");
  });
});
