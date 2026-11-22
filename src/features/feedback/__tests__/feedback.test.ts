import { describe, expect, it, vi } from "vitest";
import { useKioskStore } from "@/core/state";
import { MockFeedbackRepository } from "@/testing/fakes/mockFeedbackRepository";
import { HttpFeedbackRepository } from "../api/feedback.api";
import { apiClient } from "@/services/api/client";

describe("Feedback Submission and Kiosk Session Reset", () => {
  const repository = new MockFeedbackRepository(0);

  it("validates rating score between 1 and 5", async () => {
    await expect(
      repository.submitFeedback({
        jobId: "job-100", guidanceKind: "BOOK_GUIDANCE", terminalStatus: "FAILED",
        rating: 0,
      }),
    ).rejects.toThrow(/từ 1 đến 5/i);

    await expect(
      repository.submitFeedback({
        jobId: "job-100", guidanceKind: "BOOK_GUIDANCE", terminalStatus: "FAILED",
        rating: 6,
      }),
    ).rejects.toThrow(/từ 1 đến 5/i);
  });

  it("submits rating and resets kiosk session state upon completion", async () => {
    const store = useKioskStore.getState();
    store.setActiveJobId("job-done-123");
    store.setSelectedFacilityId("fac-shelf-a");
    const previousSessionId = store.kioskSessionId;

    const result = await repository.submitFeedback({
      jobId: "job-done-123", guidanceKind: "BOOK_GUIDANCE", terminalStatus: "COMPLETED",
      rating: 5,
      tags: ["Đến đúng kệ sách", "Di chuyển nhanh chóng"],
      comment: "LiBot dẫn đường rất chính xác!",
    });

    expect(result.success).toBe(true);

    // Kiosk state reset action
    useKioskStore.getState().resetKioskSession();

    const currentState = useKioskStore.getState();
    expect(currentState.activeJobId).toBeNull();
    expect(currentState.selectedFacilityId).toBeNull();
    expect(currentState.kioskSessionId).not.toBe(previousSessionId);
  });

  it("resets kiosk session state when user skips feedback", () => {
    const store = useKioskStore.getState();
    store.setActiveJobId("job-skipped-456");
    const oldSessionId = store.kioskSessionId;

    // Simulate skip action
    useKioskStore.getState().resetKioskSession();

    const stateAfterSkip = useKioskStore.getState();
    expect(stateAfterSkip.activeJobId).toBeNull();
    expect(stateAfterSkip.kioskSessionId).not.toBe(oldSessionId);
  });

  describe("HttpFeedbackRepository Resilience", () => {
    const httpRepo = new HttpFeedbackRepository();

    it("validates rating score between 1 and 5", async () => {
      await expect(
        httpRepo.submitFeedback({
          jobId: "00000000-0000-0000-0000-000000000001",
          guidanceKind: "BOOK_GUIDANCE",
          terminalStatus: "COMPLETED",
          rating: 0,
        }),
      ).rejects.toThrow(/từ 1 đến 5/i);
    });

    it("handles non-GUID or mock jobId gracefully without crashing", async () => {
      const result = await httpRepo.submitFeedback({
        jobId: "mock-job-id",
        guidanceKind: "BOOK_GUIDANCE",
        terminalStatus: "COMPLETED",
        rating: 5,
      });
      expect(result.success).toBe(true);
    });

    it("handles 404 response gracefully for archived/ephemeral tasks", async () => {
      vi.spyOn(apiClient, "post").mockRejectedValueOnce({ status: 404, message: "Task was not found." });

      const result = await httpRepo.submitFeedback({
        jobId: "298c8639-0c0b-4a5e-9890-cee7165d9460",
        guidanceKind: "BOOK_GUIDANCE",
        terminalStatus: "COMPLETED",
        rating: 4,
      });
      expect(result.success).toBe(true);
      vi.restoreAllMocks();
    });
  });

  describe("Feedback Screen Inactivity Lifecycle", () => {
    it("updates lastInteractionAt when user touches ratings or inputs comment", () => {
      const store = useKioskStore.getState();
      const initialTime = store.lastInteractionAt;

      // Simulate user interacting on feedback screen
      store.recordInteraction();
      const afterInteractionTime = useKioskStore.getState().lastInteractionAt;
      expect(afterInteractionTime).toBeGreaterThanOrEqual(initialTime);
    });
  });
});
