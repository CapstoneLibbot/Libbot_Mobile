import { describe, expect, it } from "vitest";
import { getEndpointsForTargetMap, worldToGazeboPixel } from "../utils/gazeboMapCoordinates";
import type { GuidanceMapEndpoint } from "../types/guidance.types";

const COORDINATE_FRAME = {
  imageWidth: 100,
  imageHeight: 80,
  resolution: 0.05,
  origin: [-1, -2, 0] as [number, number, number],
  obstacles: [],
};

describe("Gazebo map world coordinates", () => {
  it("maps the FE occupancy origin to the lower-left pixel using the FE axis direction", () => {
    expect(worldToGazeboPixel({ x: COORDINATE_FRAME.origin[0], y: COORDINATE_FRAME.origin[1] }, COORDINATE_FRAME)).toEqual({
      x: 0,
      y: COORDINATE_FRAME.imageHeight,
    });
  });

  it("round-trips a FE pixel coordinate with the same resolution and flipped image Y", () => {
    const pixelX = 42;
    const pixelY = 16;
    const worldPoint = {
      x: COORDINATE_FRAME.origin[0] + pixelX * COORDINATE_FRAME.resolution,
      y: COORDINATE_FRAME.origin[1] + (COORDINATE_FRAME.imageHeight - pixelY) * COORDINATE_FRAME.resolution,
    };

    expect(worldToGazeboPixel(worldPoint, COORDINATE_FRAME).x).toBeCloseTo(pixelX);
    expect(worldToGazeboPixel(worldPoint, COORDINATE_FRAME).y).toBeCloseTo(pixelY);
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
