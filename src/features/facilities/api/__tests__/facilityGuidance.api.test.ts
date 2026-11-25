import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/services/api/client";
import { facilityGuidanceApi, HttpFacilitiesRepository } from "../facilityGuidance.api";

vi.mock("@/services/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

describe("facilityGuidanceApi", () => {
  const get = vi.mocked(apiClient.get);
  const post = vi.mocked(apiClient.post);
  beforeEach(() => vi.clearAllMocks());

  it("searches with the facility guidance route and maps list data", async () => {
    get.mockResolvedValueOnce({ data: { facilities: [{ facilityId: "f-1", name: "Bàn thủ thư", type: "ENDPOINT", mapId: "m-1", mapName: "Tầng 1" }] } });
    await expect(facilityGuidanceApi.search("thủ thư")).resolves.toEqual([{ id: "f-1", name: "Bàn thủ thư", type: "ENDPOINT", mapId: "m-1", mapName: "Tầng 1" }]);
    expect(get).toHaveBeenCalledWith("/facility-guidance/search", { params: { query: "thủ thư", matchMode: "FUZZY", page: 1, pageSize: 50 } });
  });

  it("maps the detail shape where map metadata belongs to location", async () => {
    get.mockResolvedValueOnce({ data: { facilityId: "f-1", name: "Bàn thủ thư", type: "ENDPOINT", description: null, location: { mapId: "m-1", mapName: "Tầng 1", mapWidth: 100, mapHeight: 80, endpoint: { endpointId: "e-1", name: "Đích", x: 1, y: 2, theta: 0 } }, actions: ["VIEW_LOCATION"] } });
    const facility = await facilityGuidanceApi.getById("f-1");
    expect(facility?.location.mapId).toBe("m-1");
    expect(facility?.location.endpoint.x).toBe(1);
    expect(facility?.description).toBeNull();
  });

  it("returns null for an unknown facility", async () => {
    get.mockRejectedValueOnce({ status: 404 });
    await expect(facilityGuidanceApi.getById("missing")).resolves.toBeNull();
  });

  it("uses facility workflow endpoints", async () => {
    post.mockResolvedValueOnce({ data: { jobId: "m", executionId: "e", runtimeId: "real", workflowId: "w" } });
    await facilityGuidanceApi.start({ query: "Phòng đọc", facilityId: "f-1", runtimeId: "real", armLeaseId: "lease" });
    expect(post).toHaveBeenCalledWith("/facility-guidance/start", { query: "Phòng đọc", facilityId: "f-1", runtimeId: "real", armLeaseId: "lease" });
  });

  it("filters repository results by API type", async () => {
    get.mockResolvedValueOnce({ data: { facilities: [{ facilityId: "a", name: "Bàn thủ thư", type: "ENDPOINT", mapId: "m", mapName: "Map" }] } });
    await expect(new HttpFacilitiesRepository().search({ type: "ENDPOINT" })).resolves.toHaveLength(1);
  });
});
