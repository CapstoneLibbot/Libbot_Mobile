import type { GuidanceMapEndpoint } from "../types/guidance.types";

export interface GazeboMapMetadata {
  id?: string;
  name?: string;
  version?: string;
  imageWidth: number;
  imageHeight: number;
  resolution: number;
  origin: [number, number, number];
  obstacles: { pixelX: number; pixelY: number; pixelWidth: number; pixelHeight: number }[];
  cells?: number[];
}

/** Uses the same world-to-pixel transform as FE/src/features/maps/utils/coordinates.ts. */
export function worldToGazeboPixel(
  point: { x: number; y: number },
  map: GazeboMapMetadata,
): { x: number; y: number } {
  const deltaX = point.x - map.origin[0];
  const deltaY = point.y - map.origin[1];
  const cosine = Math.cos(map.origin[2]);
  const sine = Math.sin(map.origin[2]);
  const mapX = cosine * deltaX + sine * deltaY;
  const mapY = -sine * deltaX + cosine * deltaY;
  return {
    x: mapX / map.resolution,
    y: map.imageHeight - mapY / map.resolution,
  };
}

export interface OccupancyPaths {
  unknown: string;
  occupied: string;
}

export function getOccupancyPaths(map: GazeboMapMetadata): OccupancyPaths {
  const cells = map.cells;
  if (!cells || cells.length !== map.imageWidth * map.imageHeight) return { unknown: "", occupied: "" };
  const paths = { unknown: [] as string[], occupied: [] as string[] };
  for (let row = 0; row < map.imageHeight; row += 1) {
    let runStart = -1;
    let runType: "unknown" | "occupied" | null = null;
    for (let column = 0; column <= map.imageWidth; column += 1) {
      const value = column < map.imageWidth ? cells[row * map.imageWidth + column] : 0;
      const type = value < 0 ? "unknown" : value >= 65 ? "occupied" : null;
      if (type === runType) continue;
      if (runType && runStart >= 0) {
        const y = map.imageHeight - row - 1;
        const width = column - runStart;
        paths[runType].push(`M${runStart},${y}h${width}v1h-${width}z`);
      }
      runStart = type ? column : -1;
      runType = type;
    }
  }
  return { unknown: paths.unknown.join(""), occupied: paths.occupied.join("") };
}

export function getEndpointsForTargetMap(
  endpoints: GuidanceMapEndpoint[],
  targetEndpointId?: string | null,
): GuidanceMapEndpoint[] {
  if (!targetEndpointId) return [];
  const target = endpoints.find((endpoint) => endpoint.id === targetEndpointId);
  if (!target) return [];
  return endpoints.filter((endpoint) => endpoint.isActive && endpoint.mapId === target.mapId);
}
