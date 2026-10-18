import { apiClient } from "@/services/api/client";
import type { NavigationEndpointDto } from "@/features/catalog/api/catalog.dto";
import type { GuidanceMapEndpoint } from "../types/guidance.types";
import type { GazeboMapMetadata } from "../utils/gazeboMapCoordinates";

interface LibraryEndpointDto {
  id: string;
  mapId: string;
  name: string;
  positionX: number;
  positionY: number;
  theta: number;
  isActive: boolean;
}

export interface RobotRuntimeTelemetry {
  timestamp: string;
  pose: { x: number; y: number; yaw: number };
  localizationState: string;
  navigationState: string;
  activeGoalId?: string | null;
  plannedPath?: { x: number; y: number }[] | null;
  error?: string | null;
  battery?: number | null;
}

export interface RobotRuntime {
  id: string;
  displayName: string;
  kind: "SIM" | "REAL" | string;
  connected: boolean;
  stale: boolean;
  armed: boolean;
  armExpiresAt?: string | null;
  telemetry?: RobotRuntimeTelemetry | null;
}

export interface BookGuidanceStartRequest {
  query: string;
  runtimeId: string;
  bookId: string;
  bookItemId: string;
  armLeaseId?: string;
}

export interface BookGuidanceStartResponse {
  missionId: string;
  executionId: string;
  runtimeId: string;
  workflowId: string;
  robot?: unknown;
}

export interface BookGuidanceExecution {
  status: string;
  currentStep?: string | null;
  currentStepType?: string | null;
  expectedEventType?: string | null;
  allowedValues?: string[];
  error?: string | null;
  message?: string | null;
  result?: {
    failed_step?: string | null;
    results?: {
      step?: string | null;
      step_type?: string | null;
      result?: {
        status?: string | null;
        move_status?: string | null;
        nav2_result_code?: string | null;
        message?: string | null;
      } | null;
    }[];
  } | null;
}

export interface RuntimeArmLease {
  runtimeId: string;
  leaseId: string;
  expiresAt: string;
}

export const bookGuidanceApi = {
  async getLatestRobotMap(): Promise<{ id: string; name: string; version: string } | null> {
    const response = await apiClient.get<{ id: string; name: string; version: string } | null>(
      "/robot-runtimes/real/maps/latest",
    );
    return response.data;
  },

  async getRobotMap(mapId: string): Promise<GazeboMapMetadata | null> {
    const response = await apiClient.get<{
      id: string;
      name: string;
      version: string;
      width: number;
      height: number;
      data?: {
        format?: string;
        resolution?: number;
        origin?: unknown;
        cells?: unknown;
      } | null;
    }>(`/maps/${encodeURIComponent(mapId)}`);
    const saved = response.data;
    const origin = saved.data?.origin;
    const cells = saved.data?.cells;
    if (saved.data?.format !== "occupancy-grid-v1"
      || !Number.isInteger(saved.width) || saved.width <= 0
      || !Number.isInteger(saved.height) || saved.height <= 0
      || typeof saved.data.resolution !== "number" || saved.data.resolution <= 0
      || !Array.isArray(origin) || origin.length < 3 || !origin.slice(0, 3).every((value) => typeof value === "number")
      || !Array.isArray(cells) || cells.length !== saved.width * saved.height
      || !cells.every((value) => typeof value === "number")) {
      return null;
    }
    return {
      id: saved.id,
      name: saved.name,
      version: saved.version,
      imageWidth: saved.width,
      imageHeight: saved.height,
      resolution: saved.data.resolution,
      origin: origin.slice(0, 3) as [number, number, number],
      obstacles: [],
      cells: cells as number[],
    };
  },

  async getMapEndpoints(): Promise<GuidanceMapEndpoint[]> {
    const response = await apiClient.get<LibraryEndpointDto[]>("/endpoints");
    return response.data
      .filter((endpoint) => (
        typeof endpoint.id === "string"
        && typeof endpoint.mapId === "string"
        && typeof endpoint.name === "string"
        && Number.isFinite(endpoint.positionX)
        && Number.isFinite(endpoint.positionY)
        && Number.isFinite(endpoint.theta)
      ))
      .map((endpoint) => ({
        id: endpoint.id,
        mapId: endpoint.mapId,
        name: endpoint.name,
        x: endpoint.positionX,
        y: endpoint.positionY,
        theta: endpoint.theta,
        isActive: endpoint.isActive,
      }));
  },

  async getRuntimes(): Promise<RobotRuntime[]> {
    const response = await apiClient.get<RobotRuntime[]>("/robot-runtimes");
    return response.data;
  },

  async getRuntime(runtimeId: string): Promise<RobotRuntime> {
    const response = await apiClient.get<RobotRuntime>(`/robot-runtimes/${encodeURIComponent(runtimeId)}`);
    return response.data;
  },

  async arm(runtimeId: string): Promise<RuntimeArmLease> {
    const response = await apiClient.post<RuntimeArmLease>(`/robot-runtimes/${encodeURIComponent(runtimeId)}/arm`);
    return response.data;
  },

  async disarm(runtimeId: string): Promise<void> {
    await apiClient.delete(`/robot-runtimes/${encodeURIComponent(runtimeId)}/arm`);
  },

  async start(request: BookGuidanceStartRequest): Promise<BookGuidanceStartResponse> {
    const response = await apiClient.post<BookGuidanceStartResponse>("/book-guidance/start", request);
    return response.data;
  },

  async getExecution(executionId: string): Promise<BookGuidanceExecution> {
    const response = await apiClient.get<{ execution: BookGuidanceExecution }>(
      `/book-guidance/executions/${encodeURIComponent(executionId)}`,
    );
    return response.data.execution;
  },

  async submitEvent(executionId: string, eventType: string, data: Record<string, unknown>): Promise<void> {
    await apiClient.post("/book-guidance/events", { executionId, eventType, data });
  },

  async complete(missionId: string, succeeded: boolean, message?: string): Promise<void> {
    await apiClient.post(`/book-guidance/tasks/${encodeURIComponent(missionId)}/complete`, {
      status: succeeded ? "SUCCEEDED" : "FAILED",
      message,
    });
  },
};

export function hasNavigationEndpoint(endpoint?: NavigationEndpointDto | null): endpoint is NavigationEndpointDto {
  return Boolean(endpoint && Number.isFinite(endpoint.x) && Number.isFinite(endpoint.y) && Number.isFinite(endpoint.theta));
}
