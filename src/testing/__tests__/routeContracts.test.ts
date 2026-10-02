import { describe, expect, it, vi } from "vitest";

export interface MockRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
}

export function createSearchRouteHandlers(router: MockRouter) {
  return {
    onSelectBook: (bookId: string) => {
      router.push(`/(kiosk)/catalog/${bookId}`);
    },
    onStartGuidance: (missionId: string) => {
      router.push(`/(kiosk)/guidance/${missionId}`);
    },
    onBackToIdle: () => {
      router.replace("/(kiosk)/idle");
    },
  };
}

export function createCatalogDetailRouteHandlers(router: MockRouter) {
  return {
    onBack: () => {
      router.back();
    },
    onOpenFacility: (facilityId: string) => {
      router.push(`/(kiosk)/facilities/${facilityId}`);
    },
    onStartGuidance: (missionId: string) => {
      router.push(`/(kiosk)/guidance/${missionId}`);
    },
  };
}

export function createFacilitiesListRouteHandlers(router: MockRouter) {
  return {
    onSelectFacility: (facilityId: string) => {
      router.push(`/(kiosk)/facilities/${facilityId}`);
    },
    onBackToIdle: () => {
      router.replace("/(kiosk)/idle");
    },
  };
}

export function createFacilityDetailRouteHandlers(router: MockRouter) {
  return {
    onBack: () => {
      router.back();
    },
  };
}

export function createGuidanceRouteHandlers(router: MockRouter) {
  return {
    onGoToFeedback: (missionId: string) => {
      router.push(`/(kiosk)/feedback/${missionId}`);
    },
    onBackToSearch: () => {
      router.replace("/(kiosk)/search");
    },
  };
}

export function createFeedbackRouteHandlers(router: MockRouter) {
  return {
    onComplete: () => {
      router.replace("/(kiosk)/idle");
    },
    onSkip: () => {
      router.replace("/(kiosk)/idle");
    },
  };
}

export function createIdleRouteHandlers(router: MockRouter) {
  return {
    onNavigateToSearch: () => {
      router.push("/(kiosk)/search");
    },
    onNavigateToFacilities: () => {
      router.push("/(kiosk)/facilities");
    },
  };
}

describe("Route Adapter Contract Specifications", () => {
  const createMockRouter = (): MockRouter => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  });

  describe("Catalog Search Route Contract", () => {
    it("navigates to book detail with bookId parameter", () => {
      const router = createMockRouter();
      const handlers = createSearchRouteHandlers(router);
      handlers.onSelectBook("b-clean-arch");
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/catalog/b-clean-arch");
    });

    it("navigates directly to guidance when quick mission starts", () => {
      const router = createMockRouter();
      const handlers = createSearchRouteHandlers(router);
      handlers.onStartGuidance("mission-123");
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/guidance/mission-123");
    });

    it("replaces route with idle on back button", () => {
      const router = createMockRouter();
      const handlers = createSearchRouteHandlers(router);
      handlers.onBackToIdle();
      expect(router.replace).toHaveBeenCalledWith("/(kiosk)/idle");
    });
  });

  describe("Catalog Book Detail Route Contract", () => {
    it("handles back navigation to catalog search", () => {
      const router = createMockRouter();
      const handlers = createCatalogDetailRouteHandlers(router);
      handlers.onBack();
      expect(router.back).toHaveBeenCalled();
    });

    it("navigates to facility location map for book shelf", () => {
      const router = createMockRouter();
      const handlers = createCatalogDetailRouteHandlers(router);
      handlers.onOpenFacility("fac-shelf-a");
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/facilities/fac-shelf-a");
    });

    it("navigates to guidance route with created mission ID", () => {
      const router = createMockRouter();
      const handlers = createCatalogDetailRouteHandlers(router);
      handlers.onStartGuidance("m-456");
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/guidance/m-456");
    });
  });

  describe("Facilities List Route Contract", () => {
    it("navigates to facility detail screen", () => {
      const router = createMockRouter();
      const handlers = createFacilitiesListRouteHandlers(router);
      handlers.onSelectFacility("fac-read-1");
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/facilities/fac-read-1");
    });

    it("replaces route with idle on back", () => {
      const router = createMockRouter();
      const handlers = createFacilitiesListRouteHandlers(router);
      handlers.onBackToIdle();
      expect(router.replace).toHaveBeenCalledWith("/(kiosk)/idle");
    });
  });

  describe("Facility Detail Route Contract", () => {
    it("navigates back to facilities search", () => {
      const router = createMockRouter();
      const handlers = createFacilityDetailRouteHandlers(router);
      handlers.onBack();
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe("Guidance Route Contract", () => {
    it("navigates to feedback with missionId parameter", () => {
      const router = createMockRouter();
      const handlers = createGuidanceRouteHandlers(router);
      handlers.onGoToFeedback("m-arrival-789");
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/feedback/m-arrival-789");
    });

    it("replaces route with search on cancel or abort", () => {
      const router = createMockRouter();
      const handlers = createGuidanceRouteHandlers(router);
      handlers.onBackToSearch();
      expect(router.replace).toHaveBeenCalledWith("/(kiosk)/search");
    });
  });

  describe("Feedback Route Contract", () => {
    it("replaces route with idle on submission complete", () => {
      const router = createMockRouter();
      const handlers = createFeedbackRouteHandlers(router);
      handlers.onComplete();
      expect(router.replace).toHaveBeenCalledWith("/(kiosk)/idle");
    });

    it("replaces route with idle on skip", () => {
      const router = createMockRouter();
      const handlers = createFeedbackRouteHandlers(router);
      handlers.onSkip();
      expect(router.replace).toHaveBeenCalledWith("/(kiosk)/idle");
    });
  });

  describe("Idle Route Contract", () => {
    it("navigates to search on catalog search action", () => {
      const router = createMockRouter();
      const handlers = createIdleRouteHandlers(router);
      handlers.onNavigateToSearch();
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/search");
    });

    it("navigates to facilities on facilities action", () => {
      const router = createMockRouter();
      const handlers = createIdleRouteHandlers(router);
      handlers.onNavigateToFacilities();
      expect(router.push).toHaveBeenCalledWith("/(kiosk)/facilities");
    });
  });
});
