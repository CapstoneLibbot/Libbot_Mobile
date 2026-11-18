import { describe, expect, it } from "vitest";
import { getEndpointsForTargetMap, worldToGazeboPixel } from "../utils/gazeboMapCoordinates";
import {
  getContentBoundingBox,
  getRotatedMapBounds,
  inferHorizontalRotationAngle,
  rotateMapPixel,
} from "../utils/guidanceMapOrientation";
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

  it("rotates a diagonal occupancy map so its dominant axis is horizontal", () => {
    const width = 100;
    const height = 60;
    const cells = Array.from({ length: width * height }, () => -1);
    for (let x = 8; x < 92; x += 1) {
      const visualY = Math.round(12 + x * 0.35);
      const rawY = height - visualY - 1;
      cells[rawY * width + x] = 0;
    }

    const angle = inferHorizontalRotationAngle(width, height, cells);
    const bounds = getRotatedMapBounds(width, height, angle);
    const start = rotateMapPixel({ x: 12, y: height - 17 }, width, height, angle, bounds);
    const end = rotateMapPixel({ x: 88, y: height - 43 }, width, height, angle, bounds);

    expect(angle).not.toBe(0);
    expect(Math.abs(end.y - start.y)).toBeLessThan(1);
  });

  it("does not rotate square or unknown occupancy maps", () => {
    expect(inferHorizontalRotationAngle(20, 20, Array(400).fill(0))).toBe(0);
    expect(inferHorizontalRotationAngle(20, 10, Array(200).fill(-1))).toBe(0);
    expect(inferHorizontalRotationAngle(20, 10)).toBe(0);
  });

  it("keeps robot, endpoint, and route geometry aligned after display rotation", () => {
    const angle = Math.PI / 4;
    const bounds = getRotatedMapBounds(100, 60, angle);
    const robot = rotateMapPixel({ x: 20, y: 20 }, 100, 60, angle, bounds);
    const endpoint = rotateMapPixel({ x: 80, y: 40 }, 100, 60, angle, bounds);

    expect(Math.hypot(endpoint.x - robot.x, endpoint.y - robot.y)).toBeCloseTo(
      Math.hypot(80 - 20, 40 - 20),
    );
  });

  it("calculates tight content bounding box for rooms with padding", () => {
    const width = 100;
    const height = 100;
    const bounds = { width: 100, height: 100 };
    const extraPoints = [
      { x: 30, y: 30 },
      { x: 70, y: 70 },
    ];
    const box = getContentBoundingBox(width, height, 0, bounds, undefined, undefined, extraPoints);
    expect(box.x).toBeLessThan(30);
    expect(box.y).toBeLessThan(30);
    expect(box.x + box.width).toBeGreaterThan(70);
    expect(box.y + box.height).toBeGreaterThan(70);
  });
});
