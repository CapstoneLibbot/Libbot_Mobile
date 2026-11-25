import { apiClient } from "@/services/api/client";
import type {
  FacilityDetail,
  FacilityEndpoint,
  FacilitySearchFilter,
  FacilitySearchItem,
  FacilitySearchPage,
  FacilityType,
} from "../types/facility.types";

interface FacilitySearchDto {
  facilityId: string;
  name: string;
  type: FacilityType;
  mapId: string;
  mapName: string;
}

interface FacilityDetailDto {
  facilityId: string;
  name: string;
  type: FacilityType;
  description?: string | null;
  location: {
    mapId: string;
    mapName: string;
    mapWidth: number;
    mapHeight: number;
    endpoint: {
      endpointId: string;
      name: string;
      x: number;
      y: number;
      theta: number;
    };
  };
  actions?: string[];
}

interface FacilitySearchResponseDto {
  facilities: FacilitySearchDto[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

export interface FacilityGuidanceStartResponse {
  jobId: string;
  executionId: string;
  runtimeId: string;
  workflowId: string;
}

export interface FacilityGuidanceExecution {
  status: string;
  currentStep?: string | null;
  currentStepType?: string | null;
  expectedEventType?: string | null;
  allowedValues?: string[];
  error?: string | null;
  message?: string | null;
  result?: {
    failed_step?: string | null;
    results?: { step?: string | null; result?: { status?: string | null; message?: string | null; nav2_result_code?: string | null } | null }[];
  } | null;
}

function mapSearchItem(dto: FacilitySearchDto): FacilitySearchItem {
  return { id: dto.facilityId, name: dto.name, type: dto.type, mapId: dto.mapId, mapName: dto.mapName };
}

function mapEndpoint(endpoint: FacilityDetailDto["location"]["endpoint"]): FacilityEndpoint {
  return { endpointId: endpoint.endpointId, name: endpoint.name, x: endpoint.x, y: endpoint.y, theta: endpoint.theta };
}

function mapDetail(dto: FacilityDetailDto): FacilityDetail {
  return {
    id: dto.facilityId,
    name: dto.name,
    type: dto.type,
    description: dto.description,
    location: { ...dto.location, endpoint: mapEndpoint(dto.location.endpoint) },
    actions: Array.isArray(dto.actions) ? dto.actions : [],
  };
}

export const facilityGuidanceApi = {
  async search(query?: string, mapId?: string): Promise<FacilitySearchItem[]> {
    const response = await apiClient.get<FacilitySearchResponseDto>("/facility-guidance/search", {
      params: {
        ...(query?.trim() ? { query: query.trim() } : {}),
        ...(mapId ? { mapId } : {}),
        matchMode: "FUZZY",
        page: 1,
        pageSize: 50,
      },
    });
    return Array.isArray(response.data.facilities) ? response.data.facilities.map(mapSearchItem) : [];
  },

  async searchPage(
    query?: string,
    page = 1,
    pageSize = 20,
    mapId?: string,
  ): Promise<FacilitySearchPage> {
    const response = await apiClient.get<FacilitySearchResponseDto>("/facility-guidance/search", {
      params: {
        ...(query?.trim() ? { query: query.trim() } : {}),
        ...(mapId ? { mapId } : {}),
        matchMode: "FUZZY",
        page,
        pageSize,
      },
    });
    const items = Array.isArray(response.data.facilities) ? response.data.facilities.map(mapSearchItem) : [];
    return {
      items,
      page: response.data.page ?? page,
      pageSize: response.data.pageSize ?? pageSize,
      totalCount: response.data.totalCount ?? items.length,
      totalPages: response.data.totalPages ?? 1,
    };
  },

  async getById(facilityId: string): Promise<FacilityDetail | null> {
    try {
      const response = await apiClient.get<FacilityDetailDto>(`/facility-guidance/facilities/${encodeURIComponent(facilityId)}`);
      return mapDetail(response.data);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 404) return null;
      throw error;
    }
  },

  async start(request: { query: string; facilityId: string; runtimeId: string; armLeaseId?: string }): Promise<FacilityGuidanceStartResponse> {
    const response = await apiClient.post<FacilityGuidanceStartResponse>("/facility-guidance/start", request);
    return response.data;
  },

  async getExecution(executionId: string): Promise<FacilityGuidanceExecution> {
    const response = await apiClient.get<{ execution: FacilityGuidanceExecution }>(`/facility-guidance/executions/${encodeURIComponent(executionId)}`);
    return response.data.execution;
  },

  async submitEvent(executionId: string, eventType: string, data: Record<string, unknown>): Promise<void> {
    await apiClient.post("/facility-guidance/events", { executionId, eventType, data });
  },

  async complete(jobId: string, succeeded: boolean, message?: string): Promise<void> {
    await apiClient.post(`/facility-guidance/jobs/${encodeURIComponent(jobId)}/complete`, { status: succeeded ? "SUCCEEDED" : "FAILED", message });
  },
};

export class HttpFacilitiesRepository {
  async search(filter?: FacilitySearchFilter): Promise<FacilitySearchItem[]> {
    const items = await facilityGuidanceApi.search(filter?.query, filter?.mapId);
    return filter?.type ? items.filter((item) => item.type === filter.type) : items;
  }

  async searchPage(
    filter?: FacilitySearchFilter & { page?: number; pageSize?: number },
  ): Promise<FacilitySearchPage> {
    const result = await facilityGuidanceApi.searchPage(
      filter?.query,
      filter?.page ?? 1,
      filter?.pageSize ?? 20,
      filter?.mapId,
    );
    return filter?.type
      ? { ...result, items: result.items.filter((item) => item.type === filter.type) }
      : result;
  }

  getById(facilityId: string): Promise<FacilityDetail | null> {
    return facilityGuidanceApi.getById(facilityId);
  }
}
