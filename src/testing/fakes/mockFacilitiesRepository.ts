import {
  FacilitiesRepository,
  FacilityArea,
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

  async getAll(): Promise<FacilityArea[]> {
    await this.sleep();
    return [...facilitiesFixture];
  }

  async getById(facilityId: string): Promise<FacilityArea | null> {
    await this.sleep();
    const facility = facilitiesFixture.find((f) => f.id === facilityId);
    return facility ?? null;
  }

  async getByShelfCode(shelfCode: string): Promise<FacilityArea | null> {
    await this.sleep();
    const facility = facilitiesFixture.find((f) => f.shelfCode === shelfCode);
    return facility ?? null;
  }
}
