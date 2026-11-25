import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/services/api/client";
import { bookGuidanceApi } from "../bookGuidance.api";

vi.mock("@/services/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("bookGuidanceApi", () => {
  const mockGet = vi.mocked(apiClient.get);
  const mockPost = vi.mocked(apiClient.post);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps library endpoint coordinates from the endpoint resource API", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{
        id: "endpoint-1",
        mapId: "map-1",
        name: "Endpoint 1",
        positionX: 1,
        positionY: 2,
        theta: 0,
        isActive: true,
      }],
    });

    await expect(bookGuidanceApi.getMapEndpoints()).resolves.toEqual([{
      id: "endpoint-1",
      mapId: "map-1",
      name: "Endpoint 1",
      x: 1,
      y: 2,
      theta: 0,
      isActive: true,
    }]);
    expect(mockGet).toHaveBeenCalledWith("/endpoints");
  });

  it("preserves execution failure details for the guidance screen", async () => {
    const execution = {
      status: "failed",
      currentStep: "S120",
      result: {
        failed_step: "S120",
        results: [{
          step: "S120",
          step_type: "MOVE",
          result: {
            status: "error",
            nav2_result_code: "SIM_CLOCK_UNAVAILABLE",
            message: "No simulated time was received.",
          },
        }],
      },
    };
    mockGet.mockResolvedValueOnce({ data: { execution } });

    await expect(bookGuidanceApi.getExecution("execution-1")).resolves.toEqual(execution);
    expect(mockGet).toHaveBeenCalledWith("/book-guidance/executions/execution-1");
  });

  it("cancels an active guidance job via /jobs/{id}/cancel", async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });

    await bookGuidanceApi.cancelJob("job-123");
    expect(mockPost).toHaveBeenCalledWith("/jobs/job-123/cancel");
  });
});
