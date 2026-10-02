import type { CatalogRepository } from "@/features/catalog/types/catalog.types";
import type { FacilitiesRepository } from "@/features/facilities/types/facility.types";
import type { GuidanceRepository } from "@/features/guidance/types/guidance.types";
import type { FeedbackRepository } from "@/features/feedback/types/feedback.types";
import { MockCatalogRepository } from "@/testing/fakes/mockCatalogRepository";
import { MockFacilitiesRepository } from "@/testing/fakes/mockFacilitiesRepository";
import { MockGuidanceRepository } from "@/testing/fakes/mockGuidanceRepository";
import { MockFeedbackRepository } from "@/testing/fakes/mockFeedbackRepository";

export interface AppRepositories {
  catalog: CatalogRepository;
  facilities: FacilitiesRepository;
  guidance: GuidanceRepository;
  feedback: FeedbackRepository;
}

export const appRepositories: AppRepositories = {
  catalog: new MockCatalogRepository(),
  facilities: new MockFacilitiesRepository(),
  guidance: new MockGuidanceRepository(),
  feedback: new MockFeedbackRepository(),
};

export const getCatalogRepository = (): CatalogRepository =>
  appRepositories.catalog;
export const getFacilitiesRepository = (): FacilitiesRepository =>
  appRepositories.facilities;
export const getGuidanceRepository = (): GuidanceRepository =>
  appRepositories.guidance;
export const getFeedbackRepository = (): FeedbackRepository =>
  appRepositories.feedback;
