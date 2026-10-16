import { describe, expect, it } from "vitest";
import { GAZEBO_MAP, worldToGazeboPixel } from "../utils/gazeboMapCoordinates";

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
});
