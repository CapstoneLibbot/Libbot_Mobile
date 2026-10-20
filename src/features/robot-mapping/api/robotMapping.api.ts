import { apiClient } from "@/services/api/client";
import type {
  ArmLease,
  LiveOccupancyGrid,
  RobotRuntime,
  SavedRobotMap,
} from "../types/robotMapping.types";

export async function getRobotRuntimes(): Promise<RobotRuntime[]> {
  const response = await apiClient.get<RobotRuntime[]>("/robot-runtimes");
  return response.data;
}

export async function getLatestRobotMapGrid(): Promise<LiveOccupancyGrid | null> {
  const response = await apiClient.get<LiveOccupancyGrid | null>("/robot-runtimes/real/map");
  if (response.status === 204 || !response.data) return null;
  return response.data;
}

export async function getSavedRobotMaps(): Promise<SavedRobotMap[]> {
  const response = await apiClient.get<SavedRobotMap[]>("/robot-runtimes/real/maps");
  return response.data.filter((item) => item.data?.format === "occupancy-grid-v1");
}

export async function armRuntime(runtimeId: string): Promise<ArmLease> {
  const response = await apiClient.post<ArmLease>(`/robot-runtimes/${encodeURIComponent(runtimeId)}/arm`);
  return response.data;
}

export async function disarmRuntime(runtimeId: string): Promise<void> {
  await apiClient.delete(`/robot-runtimes/${encodeURIComponent(runtimeId)}/arm`);
}

export async function sendManualVelocity(
  runtimeId: string,
  velocity: { linearX: number; linearY: number; angularZ: number },
  armLeaseId: string,
): Promise<void> {
  await apiClient.post(`/robot-runtimes/${encodeURIComponent(runtimeId)}/manual-velocity`, {
    ...velocity,
    armLeaseId,
  });
}

export interface ManualStopResponse {
  navigation_active?: boolean;
  navigation_restarted?: boolean;
}

export async function stopManual(
  runtimeId: string,
  resumeNavigation = false,
): Promise<ManualStopResponse> {
  const response = await apiClient.post<ManualStopResponse>(
    `/robot-runtimes/${encodeURIComponent(runtimeId)}/manual-stop`,
    null,
    { params: resumeNavigation ? { resumeNavigation: true } : undefined },
  );
  return response.data;
}

export async function setMapping(
  runtimeId: string,
  enabled: boolean,
  armLeaseId?: string | null,
): Promise<void> {
  await apiClient.post(`/robot-runtimes/${encodeURIComponent(runtimeId)}/mapping`, null, {
    params: { enabled, armLeaseId: armLeaseId || undefined },
  });
}

export async function saveRobotMap(name: string, armLeaseId: string): Promise<SavedRobotMap> {
  const response = await apiClient.post<SavedRobotMap>(
    "/robot-runtimes/real/maps",
    { name },
    { params: { armLeaseId } },
  );
  return response.data;
}

export async function getSavedRobotMapGrid(mapId: string): Promise<LiveOccupancyGrid> {
  const response = await apiClient.get<{
    width: number;
    height: number;
    data?: {
      format?: string;
      resolution?: number;
      origin?: unknown;
      timestamp?: string;
      cells?: unknown;
    } | null;
  }>(`/maps/${encodeURIComponent(mapId)}`);
  const saved = response.data;
  const origin = saved.data?.origin;
  const cells = saved.data?.cells;
  if (
    saved.data?.format !== "occupancy-grid-v1"
    || !Number.isInteger(saved.width) || saved.width <= 0
    || !Number.isInteger(saved.height) || saved.height <= 0
    || typeof saved.data.resolution !== "number" || saved.data.resolution <= 0
    || !Array.isArray(origin) || origin.length < 3
    || !origin.slice(0, 3).every((value) => typeof value === "number" && Number.isFinite(value))
    || !Array.isArray(cells) || cells.length !== saved.width * saved.height
    || !cells.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    throw new Error("Backend trả về dữ liệu map không hợp lệ.");
  }

  return {
    timestamp: saved.data.timestamp ?? new Date().toISOString(),
    width: saved.width,
    height: saved.height,
    resolution: saved.data.resolution,
    originX: origin[0] as number,
    originY: origin[1] as number,
    originYaw: origin[2] as number,
    data: cells as number[],
  };
}

export async function startNavigationMode(mapId: string, armLeaseId: string): Promise<void> {
  await apiClient.post(`/maps/${encodeURIComponent(mapId)}/start-navigation`, null, {
    params: { armLeaseId },
  });
}

export async function stopNavigationMode(): Promise<void> {
  await apiClient.delete("/robot-runtimes/real/navigation-mode");
}
