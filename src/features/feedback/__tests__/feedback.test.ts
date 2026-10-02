import { describe, expect, it } from "vitest";
import { useKioskStore } from "@/core/state";
import { MockFeedbackRepository } from "@/testing/fakes/mockFeedbackRepository";

describe("Feedback Submission and Kiosk Session Reset", () => {
  const repository = new MockFeedbackRepository(0);

  it("validates rating score between 1 and 5", async () => {
    await expect(
      repository.submitFeedback({
        missionId: "m-100",
        rating: 0,
        kioskSessionId: "sess-1",
      }),
    ).rejects.toThrow(/từ 1 đến 5/i);

    await expect(
      repository.submitFeedback({
        missionId: "m-100",
        rating: 6,
        kioskSessionId: "sess-1",
      }),
    ).rejects.toThrow(/từ 1 đến 5/i);
  });

  it("submits rating and resets kiosk session state upon completion", async () => {
    const store = useKioskStore.getState();
    store.setActiveMissionId("mission-done-123");
    store.setSelectedFacilityId("fac-shelf-a");
    const previousSessionId = store.kioskSessionId;

    const result = await repository.submitFeedback({
      missionId: "mission-done-123",
      rating: 5,
      tags: ["Đến đúng kệ sách", "Di chuyển nhanh chóng"],
      comment: "LiBot dẫn đường rất chính xác!",
      kioskSessionId: previousSessionId,
    });

    expect(result.success).toBe(true);

    // Kiosk state reset action
    useKioskStore.getState().resetKioskSession();

    const currentState = useKioskStore.getState();
    expect(currentState.activeMissionId).toBeNull();
    expect(currentState.selectedFacilityId).toBeNull();
    expect(currentState.kioskSessionId).not.toBe(previousSessionId);
  });

  it("resets kiosk session state when user skips feedback", () => {
    const store = useKioskStore.getState();
    store.setActiveMissionId("mission-skipped-456");
    const oldSessionId = store.kioskSessionId;

    // Simulate skip action
    useKioskStore.getState().resetKioskSession();

    const stateAfterSkip = useKioskStore.getState();
    expect(stateAfterSkip.activeMissionId).toBeNull();
    expect(stateAfterSkip.kioskSessionId).not.toBe(oldSessionId);
  });
});
