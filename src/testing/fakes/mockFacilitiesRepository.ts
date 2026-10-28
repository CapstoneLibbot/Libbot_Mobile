import {
  FacilitiesRepository,
  FacilityDetail,
  FacilitySearchFilter,
  FacilitySearchItem,
} from "@/features/facilities/types/facility.types";
import { facilitiesFixture } from "../fixtures/facilities.fixture";

export class MockFacilitiesRepository implements FacilitiesRepository {
  private delayMs: number;

  constructor(delayMs = 150) {
    this.delayMs = delayMs;
  }

  private sleep(): Promise<void> {
    if (this.delayMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  async search(filter?: FacilitySearchFilter): Promise<FacilitySearchItem[]> {
    await this.sleep();
    return facilitiesFixture.filter((facility) =>
      (!filter?.query || facility.name.toLowerCase().includes(filter.query.toLowerCase()))
      && (!filter?.type || facility.type === filter.type));
  }

  async getById(facilityId: string): Promise<FacilityDetail | null> {
    await this.sleep();
    const facility = facilitiesFixture.find((f) => f.id === facilityId);
    return facility ? {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      description: "Dữ liệu thử nghiệm.",
      location: { mapId: facility.mapId, mapName: facility.mapName, mapWidth: 100, mapHeight: 100, endpoint: { endpointId: `${facility.id}-endpoint`, name: facility.name, x: 0, y: 0, theta: 0 } },
      actions: ["VIEW_LOCATION", "START_GUIDANCE"],
    } : null;
  }
}
