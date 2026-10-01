import { FacilityArea } from "../../features/facilities/types/facility.types";
import { facilitiesMock } from "../../mocks/facilities.mock";

export interface FacilitiesRepository {
  getAll(): Promise<FacilityArea[]>;
  getById(facilityId: string): Promise<FacilityArea | null>;
  getByShelfCode(shelfCode: string): Promise<FacilityArea | null>;
}

export class MockFacilitiesRepository implements FacilitiesRepository {
  private delayMs: number;

  constructor(delayMs = 150) {
    this.delayMs = delayMs;
  }

  private sleep(): Promise<void> {
    if (this.delayMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  async getAll(): Promise<FacilityArea[]> {
    await this.sleep();
    return [...facilitiesMock];
  }

  async getById(facilityId: string): Promise<FacilityArea | null> {
    await this.sleep();
    const facility = facilitiesMock.find((f) => f.id === facilityId);
    return facility ?? null;
  }

  async getByShelfCode(shelfCode: string): Promise<FacilityArea | null> {
    await this.sleep();
    const facility = facilitiesMock.find((f) => f.shelfCode === shelfCode);
    return facility ?? null;
  }
}

export const facilitiesRepository: FacilitiesRepository =
  new MockFacilitiesRepository();
