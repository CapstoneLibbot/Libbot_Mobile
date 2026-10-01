import { describe, expect, it } from "vitest";
import {
  calculateIndoorMapViewport,
  DEFAULT_LIBRARY_VIEWBOX,
} from "../../../shared/utils/indoorMapTransform";
import { getResponsiveBreakpoint } from "../../../shared/utils/responsive";
import { computeGuidanceDemoPresentation } from "../hooks/useGuidanceDemoViewModel";
import { GuidanceMission } from "../types/guidance.types";

describe("Guidance Responsive Layout & Mission State Hierarchy Contract", () => {
  const sampleMission: GuidanceMission = {
    id: "mission-resp-01",
    bookId: "bk-1001",
    bookTitle: "Clean Architecture",
    shelf: "A-12",
    robotId: "LiBot-01",
    status: "active",
    progress: 45,
    currentPose: { x: 5.5, y: 4.5, yaw: 0.0 },
    destination: { x: 9.8, y: 7.6, yaw: 1.57 },
    path: [
      { x: 2.2, y: 8.1, yaw: 0.0 },
      { x: 5.5, y: 4.5, yaw: 0.0 },
      { x: 9.8, y: 7.6, yaw: 1.57 },
    ],
    mapVersion: "library-l1-v1",
    routeRevision: 1,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  };

  describe("Three Width Classes Responsive Contract", () => {
    describe("1. Compact (< 600dp)", () => {
      it("classifies small phone portraits (360dp, 375dp, 390dp, 412dp) as compact width class", () => {
        const phone360 = getResponsiveBreakpoint(360, 800);
        expect(phone360.widthClass).toBe("compact");
        expect(phone360.isCompactWidth).toBe(true);
        expect(phone360.isMediumWidth).toBe(false);
        expect(phone360.isExpandedWidth).toBe(false);

        const phone390 = getResponsiveBreakpoint(390, 844);
        expect(phone390.widthClass).toBe("compact");
        expect(phone390.isCompactWidth).toBe(true);

        const boundary = getResponsiveBreakpoint(599, 900);
        expect(boundary.widthClass).toBe("compact");
      });

      it("defines compact tokens with padding that avoids mobile overflow", () => {
        const bp = getResponsiveBreakpoint(360, 800);
        expect(bp.tokens.pagePaddingHorizontal).toBe(16);
        expect(bp.tokens.cardPadding).toBe(16);
        expect(bp.tokens.contentGap).toBe(12);
      });
    });

    describe("2. Medium (600–839dp)", () => {
      it("classifies tablet portrait (600dp, 768dp, 839dp) as medium width class", () => {
        const mediumMin = getResponsiveBreakpoint(600, 900);
        expect(mediumMin.widthClass).toBe("medium");
        expect(mediumMin.isMediumWidth).toBe(true);
        expect(mediumMin.isCompactWidth).toBe(false);
        expect(mediumMin.isExpandedWidth).toBe(false);

        const ipadPortrait = getResponsiveBreakpoint(768, 1024);
        expect(ipadPortrait.widthClass).toBe("medium");
        expect(ipadPortrait.isMediumWidth).toBe(true);

        const mediumMax = getResponsiveBreakpoint(839, 1000);
        expect(mediumMax.widthClass).toBe("medium");
        expect(mediumMax.isMediumWidth).toBe(true);
      });

      it("provides medium tokens for balanced tablet portrait spacing", () => {
        const bp = getResponsiveBreakpoint(768, 1024);
        expect(bp.tokens.pagePaddingHorizontal).toBe(20);
        expect(bp.tokens.cardPadding).toBe(20);
        expect(bp.tokens.contentGap).toBe(16);
      });
    });

    describe("3. Expanded (>= 840dp)", () => {
      it("classifies displays with width >= 840dp as expanded width class", () => {
        const expandedMin = getResponsiveBreakpoint(840, 600);
        expect(expandedMin.widthClass).toBe("expanded");
        expect(expandedMin.isExpandedWidth).toBe(true);
        expect(expandedMin.isMediumWidth).toBe(false);
        expect(expandedMin.isCompactWidth).toBe(false);

        const ipadLandscape = getResponsiveBreakpoint(1024, 768);
        expect(ipadLandscape.widthClass).toBe("expanded");
        expect(ipadLandscape.isExpandedWidth).toBe(true);

        const desktopKiosk = getResponsiveBreakpoint(1280, 800);
        expect(desktopKiosk.widthClass).toBe("expanded");
        expect(desktopKiosk.isExpandedWidth).toBe(true);
      });

      it("provides expanded tokens for full kiosk layout", () => {
        const bp = getResponsiveBreakpoint(1024, 768);
        expect(bp.tokens.pagePaddingHorizontal).toBe(24);
        expect(bp.tokens.cardPadding).toBe(24);
        expect(bp.tokens.contentGap).toBe(24);
      });
    });
  });

  describe("Mission State Behavior & Copy Contract", () => {
    it("handles navigating state with primary guidance and cancel action affordance", () => {
      const state = computeGuidanceDemoPresentation({
        demoState: "navigating",
        routeRevision: 1,
        mission: sampleMission,
      });

      expect(state.isNavigating).toBe(true);
      expect(state.statusTone).toBe("info");
      expect(state.statusLabel).toBe("Đang dẫn đường đến kệ sách");
      expect(state.progress).toBe(45);
      expect(state.instructionTitle).toContain("Vui lòng đi cùng LiBot");
      expect(state.instructionMessage).toContain("Kệ A-12");
    });

    it("handles replanning state with warning tone and detour route increment", () => {
      const state = computeGuidanceDemoPresentation({
        demoState: "replanning",
        routeRevision: 2,
        mission: sampleMission,
      });

      expect(state.isReplanning).toBe(true);
      expect(state.statusTone).toBe("warning");
      expect(state.statusLabel).toBe("Robot đang chọn lối đi an toàn");
      expect(state.routeRevision).toBe(2);
      expect(state.instructionMessage).toContain("Lộ trình #2");
      expect(state.instructionMessage).toContain("lối đi an toàn thay thế");
    });

    it("handles arrived state with 100% progress and rating CTA priority", () => {
      const state = computeGuidanceDemoPresentation({
        demoState: "arrived",
        routeRevision: 1,
        mission: sampleMission,
      });

      expect(state.isArrived).toBe(true);
      expect(state.statusTone).toBe("success");
      expect(state.statusLabel).toBe("Đã đến đích thành công");
      expect(state.progress).toBe(100);
      expect(state.currentPose.x).toBe(state.destinationPose.x);
      expect(state.currentPose.y).toBe(state.destinationPose.y);
      expect(state.instructionTitle).toContain("✓ Bạn đã đến kệ sách đích!");
      expect(state.instructionMessage).toContain("đánh giá trải nghiệm");
    });

    it("handles cancelled state with danger tone and return to search copy", () => {
      const state = computeGuidanceDemoPresentation({
        demoState: "cancelled",
        routeRevision: 1,
        mission: sampleMission,
      });

      expect(state.isCancelled).toBe(true);
      expect(state.statusTone).toBe("danger");
      expect(state.statusLabel).toBe("Chuyến đi đã bị hủy");
      expect(state.instructionTitle).toContain("Hành trình đã kết thúc");
      expect(state.instructionMessage).toContain("Phiên dẫn đường đã được hủy");
    });
  });

  describe("IndoorMap Viewport Bounds Contract in Guidance", () => {
    it("always preserves map bounds during follow mode across all guidance states", () => {
      const states: ("navigating" | "replanning" | "arrived" | "cancelled")[] =
        ["navigating", "replanning", "arrived", "cancelled"];

      for (const st of states) {
        const presentation = computeGuidanceDemoPresentation({
          demoState: st,
          routeRevision: 1,
          mission: sampleMission,
        });

        const followView = calculateIndoorMapViewport({
          viewportMode: "follow",
          robotPose: presentation.currentPose,
          destinationPose: presentation.destinationPose,
          path: presentation.path,
        });

        expect(followView.x).toBeGreaterThanOrEqual(0);
        expect(followView.y).toBeGreaterThanOrEqual(0);
        expect(followView.x + followView.width).toBeLessThanOrEqual(
          DEFAULT_LIBRARY_VIEWBOX.width,
        );
        expect(followView.y + followView.height).toBeLessThanOrEqual(
          DEFAULT_LIBRARY_VIEWBOX.height,
        );
      }
    });
  });
});
