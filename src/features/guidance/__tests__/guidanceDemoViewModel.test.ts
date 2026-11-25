import { describe, expect, it } from "vitest";
import { computeGuidanceDemoPresentation } from "../hooks/useGuidanceDemoViewModel";
import {
  sampleJobAlternativePath,
  sampleJobPrimaryPath,
} from "@/testing/fixtures/jobs.fixture";
import { GuidanceJob } from "../types/guidance.types";

describe("Guidance Demo Presentation View Model", () => {
  const mockJob: GuidanceJob = {
    id: "job-test-01",
    bookId: "bk-1001",
    bookTitle: "Clean Architecture",
    shelf: "A-12",
    robotId: "LiBot-01",
    status: "active",
    progress: 45,
    currentPose: { x: 5.5, y: 4.5, yaw: 0.0 },
    destination: { x: 9.8, y: 7.6, yaw: 1.57 },
    path: sampleJobPrimaryPath,
    mapVersion: "library-l1-v1",
    routeRevision: 1,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  };

  describe("State 1: navigating (Đang dẫn đường)", () => {
    it("computes correct presentation properties for navigating state", () => {
      const result = computeGuidanceDemoPresentation({
        demoState: "navigating",
        routeRevision: 1,
        job: mockJob,
      });

      expect(result.isNavigating).toBe(true);
      expect(result.isReplanning).toBe(false);
      expect(result.isArrived).toBe(false);
      expect(result.isCancelled).toBe(false);

      expect(result.statusLabel).toBe("Đang dẫn đường đến kệ sách");
      expect(result.statusTone).toBe("info");
      expect(result.progress).toBe(45);
      expect(result.path).toEqual(sampleJobPrimaryPath);
      expect(result.mapVersion).toBe("library-l1-v1");

      expect(result.instructionTitle).toContain("Vui lòng đi cùng robot");
      expect(result.instructionMessage).toContain("Kệ A-12");
      expect(result.instructionMessage).toContain(
        "giữ khoảng cách an toàn 1 mét",
      );
    });
  });

  describe("State 2: replanning (Tính lại đường)", () => {
    it("switches to alternative route path and updates copy when replanning", () => {
      const result = computeGuidanceDemoPresentation({
        demoState: "replanning",
        routeRevision: 2,
        job: mockJob,
      });

      expect(result.isReplanning).toBe(true);
      expect(result.statusLabel).toBe("Robot đang chọn lối đi an toàn");
      expect(result.statusTone).toBe("warning");

      // Switches to detour path around obstacle
      expect(result.path).toEqual(sampleJobAlternativePath);
      expect(result.path).not.toEqual(sampleJobPrimaryPath);

      // Verifies route revision is shown in copy
      expect(result.routeRevision).toBe(2);
      expect(result.instructionMessage).toContain("Lộ trình #2");
      expect(result.instructionMessage).toContain("lối đi an toàn thay thế");
    });
  });

  describe("State 3: arrived (Đã đến nơi)", () => {
    it("places robot at destination pose and sets progress to 100% on arrival", () => {
      const result = computeGuidanceDemoPresentation({
        demoState: "arrived",
        routeRevision: 1,
        job: mockJob,
      });

      expect(result.isArrived).toBe(true);
      expect(result.statusLabel).toBe("Đã đến đích thành công");
      expect(result.statusTone).toBe("success");
      expect(result.progress).toBe(100);

      // Robot pose matches destination
      expect(result.currentPose.x).toBe(result.destinationPose.x);
      expect(result.currentPose.y).toBe(result.destinationPose.y);

      expect(result.instructionTitle).toContain("✓ Bạn đã đến kệ sách đích!");
      expect(result.instructionMessage).toContain("Kệ A-12");
      expect(result.instructionMessage).toContain("đánh giá trải nghiệm");
    });
  });

  describe("State 4: cancelled (Đã hủy)", () => {
    it("sets cancelled status, tone, and end-of-job guidance notice", () => {
      const result = computeGuidanceDemoPresentation({
        demoState: "cancelled",
        routeRevision: 1,
        job: mockJob,
      });

      expect(result.isCancelled).toBe(true);
      expect(result.statusLabel).toBe("Chuyến đi đã bị hủy");
      expect(result.statusTone).toBe("danger");

      expect(result.instructionTitle).toContain("Hành trình đã kết thúc");
      expect(result.instructionMessage).toContain(
        "Phiên dẫn đường đã được hủy",
      );
    });
  });

  describe("Fallback behavior without initial job", () => {
    it("provides sensible defaults when job is null", () => {
      const result = computeGuidanceDemoPresentation({
        demoState: "navigating",
        routeRevision: 1,
        job: null,
      });

      expect(result.mapVersion).toBe("library-l1-v1");
      expect(result.destinationPose.label).toBe("Kệ A-12");
      expect(result.currentPose.x).toBeGreaterThan(0);
      expect(result.destinationPose.x).toBeGreaterThan(0);
      expect(result.path.length).toBeGreaterThan(0);
    });
  });
});
