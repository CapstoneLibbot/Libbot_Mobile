import mapMetadataJson from "../../../../assets/maps/library-map.json";
import type { GuidanceMapEndpoint } from "../types/guidance.types";

export interface GazeboMapMetadata {
  imageWidth: number;
  imageHeight: number;
  resolution: number;
  origin: [number, number, number];
  obstacles: { pixelX: number; pixelY: number; pixelWidth: number; pixelHeight: number }[];
}

export const GAZEBO_MAP = mapMetadataJson as unknown as GazeboMapMetadata;

/** Uses the same world-to-pixel transform as FE/src/features/maps/utils/coordinates.ts. */
export function worldToGazeboPixel(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (point.x - GAZEBO_MAP.origin[0]) / GAZEBO_MAP.resolution,
    y: GAZEBO_MAP.imageHeight - (point.y - GAZEBO_MAP.origin[1]) / GAZEBO_MAP.resolution,
  };
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
