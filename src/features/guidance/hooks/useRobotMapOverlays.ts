import { useEffect, useRef, useState } from "react";
import { bookGuidanceApi } from "../api/bookGuidance.api";
import type { GuidanceMapEndpoint, GuidanceMapZone } from "../types/guidance.types";
import type { GazeboMapMetadata } from "../utils/gazeboMapCoordinates";

const MAP_REFRESH_INTERVAL_MS = 5_000;

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
}

/** Loads the same map and map-scoped overlays for every Mobile map surface. */
export function useRobotMapOverlays(
  selectedEndpointId?: string | null,
  requestedMapId?: string | null,
  options?: RobotMapOverlayOptions,
): RobotMapOverlays {
  const includeZones = options?.includeZones ?? true;
  const [mapMetadata, setMapMetadata] = useState<GazeboMapMetadata | null>(null);
  const [mapEndpoints, setMapEndpoints] = useState<GuidanceMapEndpoint[]>([]);
  const [mapZones, setMapZones] = useState<GuidanceMapZone[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [endpointsError, setEndpointsError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const loadedMapId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let requestInProgress = false;

    const refresh = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const latest = requestedMapId ? null : await bookGuidanceApi.getLatestRobotMap();
        if (!mounted) return;
        if (!requestedMapId && !latest) {
          loadedMapId.current = null;
          setMapMetadata(null);
          setMapEndpoints([]);
          setMapZones([]);
          setMapError("BE chưa có map robot đã lưu trong database.");
          setEndpointsError(null);
          setZonesError(null);
          return;
        }
        setMapError(null);

        let targetMapId = requestedMapId ?? latest!.id;
        if (!requestedMapId && selectedEndpointId) {
          try {
            const allEndpoints = await bookGuidanceApi.getMapEndpoints();
            const selectedEndpoint = allEndpoints.find((endpoint) => (
              endpoint.id.toLowerCase() === selectedEndpointId.toLowerCase()
            ));
            if (selectedEndpoint) targetMapId = selectedEndpoint.mapId;
          } catch {
            // Fall back to the latest robot map if the destination endpoint cannot be resolved.
          }
        }

        if (targetMapId !== loadedMapId.current) {
          let nextMap = null;
          try {
            nextMap = await bookGuidanceApi.getRobotMap(targetMapId);
          } catch {
            // Try the current robot map if the endpoint's map is not a saved occupancy map.
          }
          if (!nextMap && latest && targetMapId !== latest.id) {
            try {
              nextMap = await bookGuidanceApi.getRobotMap(latest.id);
            } catch {
              // Keep the previously loaded map when neither map can be fetched.
            }
          }
          if (!mounted) return;
          if (!nextMap) {
            setMapError(requestedMapId ? "Dữ liệu map của khu vực không hợp lệ." : "Dữ liệu map mới nhất không hợp lệ; đang giữ map đã tải trước đó.");
            return;
          }
          loadedMapId.current = nextMap.id ?? targetMapId;
          setMapMetadata(nextMap);
          setMapEndpoints([]);
          setMapZones([]);
          setEndpointsError(null);
          setZonesError(null);
          setMapError(null);
        }

        const mapId = loadedMapId.current;
        if (!mapId) return;

        try {
          const endpoints = await bookGuidanceApi.getMapEndpoints(mapId);
          if (!mounted) return;
          setMapEndpoints(endpoints.filter((endpoint) => endpoint.isActive));
          setEndpointsError(null);
        } catch {
          if (!mounted) return;
          setMapEndpoints([]);
          setEndpointsError("Không tải được các endpoint trên map này.");
        }

        if (!includeZones) {
          setMapZones([]);
          setZonesError(null);
          return;
        }

        try {
          const zones = await bookGuidanceApi.getMapZones(mapId);
          if (!mounted) return;
          setMapZones(zones.filter((zone) => zone.isActive));
          setZonesError(null);
        } catch {
          if (!mounted) return;
          setMapZones([]);
          setZonesError("Không tải được các zone trên map này.");
        }
      } catch {
        if (mounted) setMapError("Không tải được map robot mới nhất từ BE.");
      } finally {
        requestInProgress = false;
      }
    };

    void refresh();
    const timer = setInterval(() => { void refresh(); }, MAP_REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [selectedEndpointId, requestedMapId, includeZones]);

  return { mapMetadata, mapEndpoints, mapZones, mapError, endpointsError, zonesError };
}
