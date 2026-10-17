import { describe, expect, it } from "vitest";
import { GAZEBO_MAP, getEndpointsForTargetMap, worldToGazeboPixel } from "../utils/gazeboMapCoordinates";
import type { GuidanceMapEndpoint } from "../types/guidance.types";

describe("Gazebo map world coordinates", () => {
  it("maps the FE occupancy origin to the lower-left pixel using the FE axis direction", () => {
    expect(worldToGazeboPixel({ x: GAZEBO_MAP.origin[0], y: GAZEBO_MAP.origin[1] })).toEqual({
      x: 0,
      y: GAZEBO_MAP.imageHeight,
    });
  });

  it("round-trips a FE pixel coordinate with the same resolution and flipped image Y", () => {
    const pixelX = 42;
    const pixelY = 16;
    const worldPoint = {
      x: GAZEBO_MAP.origin[0] + pixelX * GAZEBO_MAP.resolution,
      y: GAZEBO_MAP.origin[1] + (GAZEBO_MAP.imageHeight - pixelY) * GAZEBO_MAP.resolution,
    };

    expect(worldToGazeboPixel(worldPoint).x).toBeCloseTo(pixelX);
    expect(worldToGazeboPixel(worldPoint).y).toBeCloseTo(pixelY);
  });

  it("shows active endpoints from the selected book endpoint's map only", () => {
    const endpoints: GuidanceMapEndpoint[] = [
      { id: "target", mapId: "map-a", name: "Endpoint 1", x: 1, y: 2, theta: 0, isActive: true },
      { id: "same-map", mapId: "map-a", name: "Endpoint 2", x: 2, y: 3, theta: 0, isActive: true },
      { id: "inactive", mapId: "map-a", name: "Inactive", x: 3, y: 4, theta: 0, isActive: false },
      { id: "other-map", mapId: "map-b", name: "Endpoint 3", x: 4, y: 5, theta: 0, isActive: true },
    ];

    expect(getEndpointsForTargetMap(endpoints, "target").map(({ id }) => id)).toEqual([
      "target",
      "same-map",
    ]);
    expect(getEndpointsForTargetMap(endpoints, "missing")).toEqual([]);
  });
});
