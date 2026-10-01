import { describe, expect, it } from "vitest";
import {
  calculateIndoorMapViewport,
  DEFAULT_LIBRARY_BOUNDS,
  DEFAULT_LIBRARY_VIEWBOX,
  formatPolylinePoints,
  isPoseWithinBounds,
  projectRosToSvg,
  projectSvgToRos,
  rosYawToSvgRotationDeg,
} from "../indoorMapTransform";
import {
  sampleMissionAlternativePath,
  sampleMissionPrimaryPath,
  sampleMissionTemplate,
} from "../../../mocks/missions.mock";

describe("Indoor Map Coordinate Transformation", () => {
  describe("Map bounds and origin projection", () => {
    it("defines standard 13.9m x 9.9m default library map bounds", () => {
      expect(DEFAULT_LIBRARY_BOUNDS.minX).toBe(0);
      expect(DEFAULT_LIBRARY_BOUNDS.maxX).toBe(13.9);
      expect(DEFAULT_LIBRARY_BOUNDS.minY).toBe(0);
      expect(DEFAULT_LIBRARY_BOUNDS.maxY).toBe(9.9);
    });

    it("projects ROS origin (0, 0) to bottom-left of SVG viewBox (0, 990)", () => {
      const svgPoint = projectRosToSvg({ x: 0, y: 0 });
      expect(svgPoint.x).toBe(0);
      expect(svgPoint.y).toBe(DEFAULT_LIBRARY_VIEWBOX.height); // 990
    });

    it("projects ROS top-right (13.9, 9.9) to top-right of SVG viewBox (1390, 0)", () => {
      const svgPoint = projectRosToSvg({ x: 13.9, y: 9.9 });
      expect(svgPoint.x).toBe(DEFAULT_LIBRARY_VIEWBOX.width); // 1390
      expect(svgPoint.y).toBe(0);
    });

    it("projects ROS top-left (0, 9.9) to SVG (0, 0)", () => {
      const svgPoint = projectRosToSvg({ x: 0, y: 9.9 });
      expect(svgPoint.x).toBe(0);
      expect(svgPoint.y).toBe(0);
    });

    it("projects ROS bottom-right (13.9, 0) to SVG (1390, 990)", () => {
      const svgPoint = projectRosToSvg({ x: 13.9, y: 0 });
      expect(svgPoint.x).toBe(1390);
      expect(svgPoint.y).toBe(990);
    });

    it("projects map center (6.95, 4.95) to exact SVG center (695, 495)", () => {
      const svgPoint = projectRosToSvg({ x: 6.95, y: 4.95 });
      expect(svgPoint.x).toBe(695);
      expect(svgPoint.y).toBe(495);
    });
  });

  describe("Inverted Y-axis behavior", () => {
    it("inverts the Y axis so increasing ROS Y decreases SVG Y", () => {
      const lower = projectRosToSvg({ x: 5, y: 2 });
      const higher = projectRosToSvg({ x: 5, y: 8 });

      // In ROS, higher.y > lower.y (robot moved north)
      // In SVG, higher.y < lower.y (drawn higher up on the screen)
      expect(higher.y).toBeLessThan(lower.y);
      expect(lower.x).toBe(higher.x);
    });
  });

  describe("Round-trip projection stability", () => {
    it("accurately recovers ROS coordinates from projected SVG coordinates", () => {
      const testRosPoints = [
        { x: 1.5, y: 3.2 },
        { x: 7.8, y: 5.4 },
        { x: 12.1, y: 8.9 },
        { x: 0.1, y: 0.1 },
        { x: 13.8, y: 9.8 },
      ];

      for (const pt of testRosPoints) {
        const svg = projectRosToSvg(pt);
        const recovered = projectSvgToRos(svg);
        expect(recovered.x).toBeCloseTo(pt.x, 2);
        expect(recovered.y).toBeCloseTo(pt.y, 2);
      }
    });
  });

  describe("Mock poses and paths bounds verification", () => {
    it("verifies sampleMissionTemplate currentPose is strictly within map bounds", () => {
      expect(sampleMissionTemplate.currentPose).toBeDefined();
      if (sampleMissionTemplate.currentPose) {
        expect(isPoseWithinBounds(sampleMissionTemplate.currentPose)).toBe(
          true,
        );
      }
    });

    it("verifies sampleMissionTemplate destination is strictly within map bounds", () => {
      expect(sampleMissionTemplate.destination).toBeDefined();
      if (sampleMissionTemplate.destination) {
        expect(isPoseWithinBounds(sampleMissionTemplate.destination)).toBe(
          true,
        );
      }
    });

    it("verifies all points in primary route path are within map bounds", () => {
      expect(sampleMissionPrimaryPath.length).toBeGreaterThan(0);
      for (const pt of sampleMissionPrimaryPath) {
        expect(isPoseWithinBounds(pt)).toBe(true);
        const svg = projectRosToSvg(pt);
        expect(svg.x).toBeGreaterThanOrEqual(0);
        expect(svg.x).toBeLessThanOrEqual(DEFAULT_LIBRARY_VIEWBOX.width);
        expect(svg.y).toBeGreaterThanOrEqual(0);
        expect(svg.y).toBeLessThanOrEqual(DEFAULT_LIBRARY_VIEWBOX.height);
      }
    });

    it("verifies all points in alternative replanning path are within map bounds", () => {
      expect(sampleMissionAlternativePath.length).toBeGreaterThan(0);
      for (const pt of sampleMissionAlternativePath) {
        expect(isPoseWithinBounds(pt)).toBe(true);
        const svg = projectRosToSvg(pt);
        expect(svg.x).toBeGreaterThanOrEqual(0);
        expect(svg.x).toBeLessThanOrEqual(DEFAULT_LIBRARY_VIEWBOX.width);
        expect(svg.y).toBeGreaterThanOrEqual(0);
        expect(svg.y).toBeLessThanOrEqual(DEFAULT_LIBRARY_VIEWBOX.height);
      }
    });

    it("identifies coordinates outside map bounds as invalid", () => {
      expect(isPoseWithinBounds({ x: -1, y: 5 })).toBe(false);
      expect(isPoseWithinBounds({ x: 14.5, y: 5 })).toBe(false);
      expect(isPoseWithinBounds({ x: 5, y: -0.5 })).toBe(false);
      expect(isPoseWithinBounds({ x: 5, y: 10.5 })).toBe(false);
    });
  });

  describe("Yaw to SVG rotation conversion", () => {
    it("converts East heading (yaw = 0) to 0 degrees in SVG", () => {
      expect(rosYawToSvgRotationDeg(0)).toBe(0);
    });

    it("converts North heading (yaw = PI/2) to 270 degrees in SVG (pointing up)", () => {
      expect(rosYawToSvgRotationDeg(Math.PI / 2)).toBe(270);
    });

    it("converts West heading (yaw = PI) to 180 degrees in SVG", () => {
      expect(rosYawToSvgRotationDeg(Math.PI)).toBe(180);
    });

    it("converts South heading (yaw = -PI/2) to 90 degrees in SVG (pointing down)", () => {
      expect(rosYawToSvgRotationDeg(-Math.PI / 2)).toBe(90);
    });

    it('supports markers with natural heading "up"', () => {
      expect(rosYawToSvgRotationDeg(Math.PI / 2, "up")).toBe(0);
      expect(rosYawToSvgRotationDeg(0, "up")).toBe(90);
      expect(rosYawToSvgRotationDeg(-Math.PI / 2, "up")).toBe(180);
      expect(rosYawToSvgRotationDeg(Math.PI, "up")).toBe(270);
    });
  });

  describe("Polyline points string formatting", () => {
    it("formats an array of ROS points into a valid SVG points string", () => {
      const path = [
        { x: 0, y: 0 },
        { x: 13.9, y: 9.9 },
      ];
      const result = formatPolylinePoints(path);
      expect(result).toBe("0,990 1390,0");
    });

    it("returns empty string for empty path", () => {
      expect(formatPolylinePoints([])).toBe("");
    });
  });

  describe("Indoor Map Viewport Calculation (Follow vs Overview)", () => {
    it("returns exact baseViewBox in overview mode", () => {
      const overview = calculateIndoorMapViewport({
        viewportMode: "overview",
        robotPose: { x: 5.5, y: 4.5 },
      });

      expect(overview).toEqual(DEFAULT_LIBRARY_VIEWBOX);
      expect(overview.x).toBe(0);
      expect(overview.y).toBe(0);
      expect(overview.width).toBe(1390);
      expect(overview.height).toBe(990);
    });

    it("defaults to overview mode when viewportMode is omitted", () => {
      const result = calculateIndoorMapViewport();
      expect(result).toEqual(DEFAULT_LIBRARY_VIEWBOX);
    });

    it("produces cropped (zoomed-in) viewBox in follow mode", () => {
      const follow = calculateIndoorMapViewport({
        viewportMode: "follow",
        robotPose: { x: 6.95, y: 4.95 },
      });

      expect(follow.width).toBeLessThan(DEFAULT_LIBRARY_VIEWBOX.width);
      expect(follow.height).toBeLessThan(DEFAULT_LIBRARY_VIEWBOX.height);
      expect(follow.width).toBe(
        Math.round(DEFAULT_LIBRARY_VIEWBOX.width * 0.55),
      );
      expect(follow.height).toBe(
        Math.round(DEFAULT_LIBRARY_VIEWBOX.height * 0.55),
      );
    });

    it("strictly clamps follow viewBox when robot is at origin (0, 0)", () => {
      const follow = calculateIndoorMapViewport({
        viewportMode: "follow",
        robotPose: { x: 0, y: 0 },
      });

      expect(follow.x).toBeGreaterThanOrEqual(0);
      expect(follow.y).toBeGreaterThanOrEqual(0);
      expect(follow.x + follow.width).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.width,
      );
      expect(follow.y + follow.height).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.height,
      );
      expect(follow.x).toBe(0); // Left edge clamped
      expect(follow.y + follow.height).toBe(DEFAULT_LIBRARY_VIEWBOX.height); // Bottom edge clamped
    });

    it("strictly clamps follow viewBox when robot is at top-right (13.9, 9.9)", () => {
      const follow = calculateIndoorMapViewport({
        viewportMode: "follow",
        robotPose: { x: 13.9, y: 9.9 },
      });

      expect(follow.x).toBeGreaterThanOrEqual(0);
      expect(follow.y).toBeGreaterThanOrEqual(0);
      expect(follow.x + follow.width).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.width,
      );
      expect(follow.y + follow.height).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.height,
      );
      expect(follow.x + follow.width).toBe(DEFAULT_LIBRARY_VIEWBOX.width); // Right edge clamped
      expect(follow.y).toBe(0); // Top edge clamped
    });

    it("strictly clamps follow viewBox even when robot coordinates are far out of bounds", () => {
      // Robot far beyond top-left
      const outTopLeft = calculateIndoorMapViewport({
        viewportMode: "follow",
        robotPose: { x: -100, y: 500 },
      });
      expect(outTopLeft.x).toBe(0);
      expect(outTopLeft.y).toBe(0);
      expect(outTopLeft.x + outTopLeft.width).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.width,
      );
      expect(outTopLeft.y + outTopLeft.height).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.height,
      );

      // Robot far beyond bottom-right
      const outBottomRight = calculateIndoorMapViewport({
        viewportMode: "follow",
        robotPose: { x: 9999, y: -9999 },
      });
      expect(outBottomRight.x + outBottomRight.width).toBe(
        DEFAULT_LIBRARY_VIEWBOX.width,
      );
      expect(outBottomRight.y + outBottomRight.height).toBe(
        DEFAULT_LIBRARY_VIEWBOX.height,
      );
      expect(outBottomRight.x).toBeGreaterThanOrEqual(0);
      expect(outBottomRight.y).toBeGreaterThanOrEqual(0);
    });

    it("keeps follow viewBox strictly within map bounds across all points on primary path", () => {
      for (const pt of sampleMissionPrimaryPath) {
        const view = calculateIndoorMapViewport({
          viewportMode: "follow",
          robotPose: pt,
          path: sampleMissionPrimaryPath,
        });

        expect(view.x).toBeGreaterThanOrEqual(0);
        expect(view.y).toBeGreaterThanOrEqual(0);
        expect(view.x + view.width).toBeLessThanOrEqual(
          DEFAULT_LIBRARY_VIEWBOX.width,
        );
        expect(view.y + view.height).toBeLessThanOrEqual(
          DEFAULT_LIBRARY_VIEWBOX.height,
        );
      }
    });

    it("keeps follow viewBox strictly within map bounds across all points on alternative replanning path", () => {
      for (const pt of sampleMissionAlternativePath) {
        const view = calculateIndoorMapViewport({
          viewportMode: "follow",
          robotPose: pt,
          path: sampleMissionAlternativePath,
        });

        expect(view.x).toBeGreaterThanOrEqual(0);
        expect(view.y).toBeGreaterThanOrEqual(0);
        expect(view.x + view.width).toBeLessThanOrEqual(
          DEFAULT_LIBRARY_VIEWBOX.width,
        );
        expect(view.y + view.height).toBeLessThanOrEqual(
          DEFAULT_LIBRARY_VIEWBOX.height,
        );
      }
    });

    it("supports custom zoom ratios while preserving bounds guarantees", () => {
      const tightZoom = calculateIndoorMapViewport({
        viewportMode: "follow",
        robotPose: { x: 6.95, y: 4.95 },
        followWidthRatio: 0.3,
        followHeightRatio: 0.3,
      });

      expect(tightZoom.width).toBe(
        Math.round(DEFAULT_LIBRARY_VIEWBOX.width * 0.3),
      );
      expect(tightZoom.height).toBe(
        Math.round(DEFAULT_LIBRARY_VIEWBOX.height * 0.3),
      );
      expect(tightZoom.x).toBeGreaterThanOrEqual(0);
      expect(tightZoom.y).toBeGreaterThanOrEqual(0);
      expect(tightZoom.x + tightZoom.width).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.width,
      );
      expect(tightZoom.y + tightZoom.height).toBeLessThanOrEqual(
        DEFAULT_LIBRARY_VIEWBOX.height,
      );
    });
  });
});
