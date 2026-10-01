/**
 * Indoor Map Coordinate Transformation Utilities
 *
 * Maps ROS coordinate frame (meters, standard Cartesian with Y up)
 * to SVG ViewBox space (pixels, Y down).
 *
 * ROS Map Frame (Occupancy Grid):
 * - X: 0.0m (West / Left) -> 13.9m (East / Right)
 * - Y: 0.0m (South / Bottom) -> 9.9m (North / Top)
 * - Yaw: Radians counter-clockwise from East (+X)
 *
 * SVG ViewBox Space:
 * - X: 0 (Left) -> 1390 (Right)
 * - Y: 0 (Top) -> 990 (Bottom)  [Inverted Y]
 */

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface SvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RosPoint {
  x: number;
  y: number;
  yaw?: number;
}

export interface SvgPoint {
  x: number;
  y: number;
}

export interface IndoorMapTransform {
  mapVersion: string;
  bounds: MapBounds;
  viewBox: SvgViewBox;
  resolution: number;
}

export const DEFAULT_MAP_VERSION = "library-l1-v1";

/**
 * 278 x 198 cells at 0.05m/cell ~ 13.9m x 9.9m
 */
export const DEFAULT_LIBRARY_BOUNDS: MapBounds = {
  minX: 0,
  maxX: 13.9,
  minY: 0,
  maxY: 9.9,
};

/**
 * 1390 x 990 viewBox maintains exact 13.9:9.9 aspect ratio (100 SVG units/meter)
 */
export const DEFAULT_LIBRARY_VIEWBOX: SvgViewBox = {
  x: 0,
  y: 0,
  width: 1390,
  height: 990,
};

export const DEFAULT_INDOOR_TRANSFORM: IndoorMapTransform = {
  mapVersion: DEFAULT_MAP_VERSION,
  bounds: DEFAULT_LIBRARY_BOUNDS,
  viewBox: DEFAULT_LIBRARY_VIEWBOX,
  resolution: 0.05,
};

/**
 * Projects a ROS {x, y} coordinate in meters to SVG ViewBox {x, y} pixels.
 * Y axis is inverted: ROS y=minY maps to SVG y=viewBox.y + viewBox.height (bottom).
 */
export function projectRosToSvg(
  rosPoint: { x: number; y: number },
  bounds: MapBounds = DEFAULT_LIBRARY_BOUNDS,
  viewBox: SvgViewBox = DEFAULT_LIBRARY_VIEWBOX,
): SvgPoint {
  const rangeX = bounds.maxX - bounds.minX;
  const rangeY = bounds.maxY - bounds.minY;

  const safeRangeX = rangeX === 0 ? 1 : rangeX;
  const safeRangeY = rangeY === 0 ? 1 : rangeY;

  const normX = (rosPoint.x - bounds.minX) / safeRangeX;
  // Invert Y axis: higher ROS Y is further up, which has smaller SVG Y.
  const normY = (bounds.maxY - rosPoint.y) / safeRangeY;

  const svgX = viewBox.x + normX * viewBox.width;
  const svgY = viewBox.y + normY * viewBox.height;

  return {
    x: Number(svgX.toFixed(2)),
    y: Number(svgY.toFixed(2)),
  };
}

/**
 * Inverse projection: maps SVG ViewBox {x, y} back to ROS {x, y} meters.
 */
export function projectSvgToRos(
  svgPoint: SvgPoint,
  bounds: MapBounds = DEFAULT_LIBRARY_BOUNDS,
  viewBox: SvgViewBox = DEFAULT_LIBRARY_VIEWBOX,
): { x: number; y: number } {
  const normX = (svgPoint.x - viewBox.x) / viewBox.width;
  const normY = (svgPoint.y - viewBox.y) / viewBox.height;

  const rosX = bounds.minX + normX * (bounds.maxX - bounds.minX);
  const rosY = bounds.maxY - normY * (bounds.maxY - bounds.minY);

  return {
    x: Number(rosX.toFixed(4)),
    y: Number(rosY.toFixed(4)),
  };
}

/**
 * Converts ROS yaw (radians, counter-clockwise from East/+X)
 * to SVG clockwise rotation in degrees.
 *
 * In standard SVG screen space (Y points down), a clockwise rotation around Z
 * inverts the sense of positive trigonometric angles:
 * - ROS yaw = 0 rad (East / +X) -> 0 deg (pointing East)
 * - ROS yaw = PI/2 rad (North / +Y) -> 270 deg (pointing North / Up)
 * - ROS yaw = PI rad (West / -X) -> 180 deg (pointing West)
 * - ROS yaw = -PI/2 rad (South / -Y) -> 90 deg (pointing South / Down)
 */
export function rosYawToSvgRotationDeg(
  yawRadians: number,
  naturalHeading: "right" | "up" = "right",
): number {
  const baseDeg = (-yawRadians * 180) / Math.PI;
  const angle = naturalHeading === "up" ? baseDeg + 90 : baseDeg;
  const normalized = ((angle % 360) + 360) % 360;
  return Number(normalized.toFixed(2));
}

/**
 * Converts an array of ROS path points into an SVG polyline string: "x1,y1 x2,y2 ..."
 */
export function formatPolylinePoints(
  path: { x: number; y: number }[],
  bounds: MapBounds = DEFAULT_LIBRARY_BOUNDS,
  viewBox: SvgViewBox = DEFAULT_LIBRARY_VIEWBOX,
): string {
  return path
    .map((pt) => {
      const p = projectRosToSvg(pt, bounds, viewBox);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

/**
 * Verifies if a given pose is strictly within the map bounds.
 */
export function isPoseWithinBounds(
  pose: { x: number; y: number },
  bounds: MapBounds = DEFAULT_LIBRARY_BOUNDS,
): boolean {
  return (
    pose.x >= bounds.minX &&
    pose.x <= bounds.maxX &&
    pose.y >= bounds.minY &&
    pose.y <= bounds.maxY
  );
}

export type IndoorMapViewportMode = "follow" | "overview";

export interface ViewportCalculationParams {
  viewportMode?: IndoorMapViewportMode;
  robotPose?: { x: number; y: number; yaw?: number };
  destinationPose?: { x: number; y: number };
  path?: { x: number; y: number }[];
  bounds?: MapBounds;
  baseViewBox?: SvgViewBox;
  followWidthRatio?: number;
  followHeightRatio?: number;
}

/**
 * Calculates the active SVG ViewBox for the indoor map.
 * In 'overview' mode, returns the full baseViewBox.
 * In 'follow' mode, crops a zoomed region focused on the robot and upcoming route,
 * strictly clamped so that the viewBox NEVER exceeds the baseViewBox bounds.
 */
export function calculateIndoorMapViewport({
  viewportMode = "overview",
  robotPose = { x: 5.5, y: 4.5 },
  destinationPose,
  path,
  bounds = DEFAULT_LIBRARY_BOUNDS,
  baseViewBox = DEFAULT_LIBRARY_VIEWBOX,
  followWidthRatio = 0.55,
  followHeightRatio = 0.55,
}: ViewportCalculationParams = {}): SvgViewBox {
  if (viewportMode === "overview") {
    return {
      x: baseViewBox.x,
      y: baseViewBox.y,
      width: baseViewBox.width,
      height: baseViewBox.height,
    };
  }

  // Follow mode: calculate zoomed viewBox dimensions
  const clampedRatioW = Math.max(0.2, Math.min(1.0, followWidthRatio));
  const clampedRatioH = Math.max(0.2, Math.min(1.0, followHeightRatio));

  const followWidth = Math.min(
    Math.round(baseViewBox.width * clampedRatioW),
    baseViewBox.width,
  );
  const followHeight = Math.min(
    Math.round(baseViewBox.height * clampedRatioH),
    baseViewBox.height,
  );

  const robotSvg = projectRosToSvg(robotPose, bounds, baseViewBox);
  let targetCenterX = robotSvg.x;
  let targetCenterY = robotSvg.y;

  // Bias focus slightly towards upcoming path waypoints ahead of the robot
  if (path && path.length > 0) {
    const upcomingPoints = path.filter((pt) => {
      const dist = Math.hypot(pt.x - robotPose.x, pt.y - robotPose.y);
      return dist > 0.4 && dist < 3.5;
    });

    if (upcomingPoints.length > 0) {
      const nextSvg = projectRosToSvg(upcomingPoints[0], bounds, baseViewBox);
      targetCenterX = robotSvg.x * 0.75 + nextSvg.x * 0.25;
      targetCenterY = robotSvg.y * 0.75 + nextSvg.y * 0.25;
    } else if (destinationPose) {
      const destSvg = projectRosToSvg(destinationPose, bounds, baseViewBox);
      targetCenterX = robotSvg.x * 0.8 + destSvg.x * 0.2;
      targetCenterY = robotSvg.y * 0.8 + destSvg.y * 0.2;
    }
  }

  // Desired top-left corner
  let vx = targetCenterX - followWidth / 2;
  let vy = targetCenterY - followHeight / 2;

  // Enforce strict map bounds: viewBox must remain entirely inside baseViewBox
  const minX = baseViewBox.x;
  const maxX = baseViewBox.x + baseViewBox.width - followWidth;
  const minY = baseViewBox.y;
  const maxY = baseViewBox.y + baseViewBox.height - followHeight;

  vx = Math.max(minX, Math.min(maxX, vx));
  vy = Math.max(minY, Math.min(maxY, vy));

  return {
    x: Number(vx.toFixed(2)),
    y: Number(vy.toFixed(2)),
    width: followWidth,
    height: followHeight,
  };
}
