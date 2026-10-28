import type { CatalogRepository } from "@/features/catalog/types/catalog.types";
import type { FacilitiesRepository } from "@/features/facilities/types/facility.types";
import type { GuidanceRepository } from "@/features/guidance/types/guidance.types";
import type { FeedbackRepository } from "@/features/feedback/types/feedback.types";
import { MockCatalogRepository } from "@/testing/fakes/mockCatalogRepository";
import { MockGuidanceRepository } from "@/testing/fakes/mockGuidanceRepository";
import { MockFeedbackRepository } from "@/testing/fakes/mockFeedbackRepository";
import { env } from "@/config/env";
import { HttpCatalogRepository } from "@/features/catalog/api/catalog.api";
import { HttpFacilitiesRepository } from "@/features/facilities/api/facilityGuidance.api";

export interface AppRepositories {
  catalog: CatalogRepository;
  facilities: FacilitiesRepository;
  guidance: GuidanceRepository;
  feedback: FeedbackRepository;
}

export const appRepositories: AppRepositories = {
  catalog: env.isMock
    ? new MockCatalogRepository()
    : new HttpCatalogRepository(),
  facilities: new HttpFacilitiesRepository(),
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

export const setCatalogRepository = (repository: CatalogRepository): void => {
  appRepositories.catalog = repository;
};
