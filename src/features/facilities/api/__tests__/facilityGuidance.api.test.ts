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

  it("supports paginated facility search with totalPages metadata", async () => {
    get.mockResolvedValueOnce({
      data: {
        facilities: [{ facilityId: "f-2", name: "Kệ B", type: "ENDPOINT", mapId: "m", mapName: "Map" }],
        page: 2,
        pageSize: 20,
        totalCount: 25,
        totalPages: 2,
      },
    });

    const page = await new HttpFacilitiesRepository().searchPage({ query: "Kệ", page: 2, pageSize: 20 });
    expect(get).toHaveBeenCalledWith("/facility-guidance/search", {
      params: { query: "Kệ", matchMode: "FUZZY", page: 2, pageSize: 20 },
    });
    expect(page.totalCount).toBe(25);
    expect(page.totalPages).toBe(2);
    expect(page.items).toHaveLength(1);
  });

  it("forwards mapId filter when searching facilities on robot active map", async () => {
    get.mockResolvedValueOnce({
      data: {
        facilities: [{ facilityId: "f-3", name: "Kệ Công nghệ A", type: "ENDPOINT", mapId: "map-v4", mapName: "LiBotmapV4" }],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    });

    await new HttpFacilitiesRepository().searchPage({ query: "Kệ", mapId: "map-v4", page: 1, pageSize: 20 });
    expect(get).toHaveBeenCalledWith("/facility-guidance/search", {
      params: { query: "Kệ", mapId: "map-v4", matchMode: "FUZZY", page: 1, pageSize: 20 },
    });
  });
});
