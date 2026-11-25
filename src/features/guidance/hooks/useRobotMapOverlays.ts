import { useQuery } from "@tanstack/react-query";
import { appQueryClient } from "@/core/providers/QueryProvider";
import { queryKeys } from "@/core/state";
import { bookGuidanceApi, type NavigationEndpoint } from "../api/bookGuidance.api";
import type { GuidanceMapEndpoint, GuidanceMapZone } from "../types/guidance.types";
import type { GazeboMapMetadata } from "../utils/gazeboMapCoordinates";

const MAP_STALE_TIME_MS = 5 * 60_000;

/** Pre-seeds React Query endpoint cache from book/facility detail payloads so GuidanceScreen avoids re-fetching. */
export function seedEndpointQueryCache(endpoint?: {
  endpointId: string;
  mapId?: string;
  name: string;
  x: number;
  y: number;
  theta: number;
} | null): void {
  if (!endpoint?.endpointId || !endpoint.mapId) return;
  const cached: NavigationEndpoint = {
    id: endpoint.endpointId,
    mapId: endpoint.mapId,
    name: endpoint.name,
    positionX: endpoint.x,
    positionY: endpoint.y,
    theta: endpoint.theta,
    isActive: true,
  };
  appQueryClient.setQueryData(queryKeys.endpoints.detail(endpoint.endpointId), cached);
}

export interface RobotMapOverlays {
  mapMetadata: GazeboMapMetadata | null;
  mapEndpoints: GuidanceMapEndpoint[];
  mapZones: GuidanceMapZone[];
  mapError: string | null;
  endpointsError: string | null;
  zonesError: string | null;
}

export interface RobotMapOverlayOptions {
  includeZones?: boolean;
  runtimeActiveMapId?: string | null;
}

/** Loads the same map and map-scoped overlays via React Query cache for every Mobile map surface. */
export function useRobotMapOverlays(
  selectedEndpointId?: string | null,
  requestedMapId?: string | null,
  options?: RobotMapOverlayOptions,
): RobotMapOverlays {
  const includeZones = options?.includeZones ?? true;
  const runtimeActiveMapId = options?.runtimeActiveMapId ?? null;
  const needLatestFallback = !requestedMapId && !runtimeActiveMapId;

  const latestMapQuery = useQuery({
    queryKey: queryKeys.maps.latest(),
    queryFn: () => bookGuidanceApi.getLatestRobotMap(),
    enabled: needLatestFallback,
    staleTime: MAP_STALE_TIME_MS,
  });

  const selectedEndpointQuery = useQuery({
    queryKey: queryKeys.endpoints.detail(selectedEndpointId ?? ""),
    queryFn: () => bookGuidanceApi.getEndpoint(selectedEndpointId!),
    enabled: Boolean(!requestedMapId && selectedEndpointId),
    staleTime: MAP_STALE_TIME_MS,
  });

  const targetMapId =
    requestedMapId ||
    selectedEndpointQuery.data?.mapId ||
    runtimeActiveMapId ||
    latestMapQuery.data?.id ||
    null;

  const mapQuery = useQuery({
    queryKey: queryKeys.maps.detail(targetMapId ?? ""),
    queryFn: async () => {
      const nextMap = await bookGuidanceApi.getRobotMap(targetMapId!);
      if (nextMap) return nextMap;
      const fallbackId = latestMapQuery.data?.id;
      if (fallbackId && fallbackId !== targetMapId) {
        return bookGuidanceApi.getRobotMap(fallbackId);
      }
      return null;
    },
    enabled: Boolean(targetMapId),
    staleTime: MAP_STALE_TIME_MS,
  });

  const resolvedMapId = mapQuery.data?.id ?? targetMapId;

  const endpointsQuery = useQuery({
    queryKey: queryKeys.maps.endpoints(resolvedMapId ?? ""),
    queryFn: async () => {
      const items = await bookGuidanceApi.getMapEndpoints(resolvedMapId!);
      return items.filter((endpoint) => endpoint.isActive);
    },
    enabled: Boolean(resolvedMapId),
    staleTime: MAP_STALE_TIME_MS,
  });

  const zonesQuery = useQuery({
    queryKey: queryKeys.maps.zones(resolvedMapId ?? ""),
    queryFn: async () => {
      const items = await bookGuidanceApi.getMapZones(resolvedMapId!);
      return items.filter((zone) => zone.isActive);
    },
    enabled: Boolean(resolvedMapId && includeZones),
    staleTime: MAP_STALE_TIME_MS,
  });

  let mapError: string | null = null;
  if (needLatestFallback && !latestMapQuery.isLoading && !latestMapQuery.data && !targetMapId) {
    mapError = latestMapQuery.isError
      ? "Không tải được map robot mới nhất từ BE."
      : "BE chưa có map robot đã lưu trong database.";
  } else if (mapQuery.isError) {
    mapError = "Không tải được map robot mới nhất từ BE.";
  } else if (targetMapId && mapQuery.isFetched && !mapQuery.data) {
    mapError = requestedMapId
      ? "Dữ liệu map của khu vực không hợp lệ."
      : "Dữ liệu map mới nhất không hợp lệ; đang giữ map đã tải trước đó.";
  }

  return {
    mapMetadata: mapQuery.data ?? null,
    mapEndpoints: endpointsQuery.data ?? [],
    mapZones: includeZones ? (zonesQuery.data ?? []) : [],
    mapError,
    endpointsError: endpointsQuery.isError ? "Không tải được các endpoint trên map này." : null,
    zonesError: includeZones && zonesQuery.isError ? "Không tải được các zone trên map này." : null,
  };
}
