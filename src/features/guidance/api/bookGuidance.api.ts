import { apiClient } from "@/services/api/client";
import type { NavigationEndpointDto } from "@/features/catalog/api/catalog.dto";

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
}

export interface RuntimeArmLease {
  runtimeId: string;
  leaseId: string;
  expiresAt: string;
}

export const bookGuidanceApi = {
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
