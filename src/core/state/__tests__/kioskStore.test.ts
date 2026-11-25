import { describe, expect, it } from "vitest";
import { useKioskStore } from "../kioskStore";

describe("Kiosk Zustand Store (src/core/state)", () => {
  it("initializes with default kiosk state", () => {
    const state = useKioskStore.getState();
    expect(state.kioskSessionId).toBeDefined();
    expect(state.activeJobId).toBeNull();
    expect(state.selectedFacilityId).toBeNull();
    expect(typeof state.lastInteractionAt).toBe("number");
  });

  it("updates activeJobId and records interaction timestamp", () => {
    const store = useKioskStore.getState();
    const previousTime = store.lastInteractionAt;

    store.setActiveJobId("job-12345");
    const newState = useKioskStore.getState();

    expect(newState.activeJobId).toBe("job-12345");
    expect(newState.lastInteractionAt).toBeGreaterThanOrEqual(previousTime);
  });

  it("records interaction without changing active job", () => {
    const store = useKioskStore.getState();
    store.setActiveJobId("job-keep-active");
    const initialTime = store.lastInteractionAt;

    store.recordInteraction();
    const state = useKioskStore.getState();

    expect(state.activeJobId).toBe("job-keep-active");
    expect(state.lastInteractionAt).toBeGreaterThanOrEqual(initialTime);
  });

  it("resetKioskSession clears active job, selected facility and generates a fresh session ID", () => {
    const store = useKioskStore.getState();
    store.setActiveJobId("job-to-clear");
    store.setSelectedFacilityId("fac-reading-1");
    const oldSessionId = store.kioskSessionId;

    store.resetKioskSession();
    const resetState = useKioskStore.getState();

    expect(resetState.activeJobId).toBeNull();
    expect(resetState.selectedFacilityId).toBeNull();
    expect(resetState.kioskSessionId).not.toBe(oldSessionId);
    expect(resetState.kioskSessionId).toMatch(/^kiosk-/);
  });
});
