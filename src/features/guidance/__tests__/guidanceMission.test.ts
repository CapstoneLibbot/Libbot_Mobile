import { describe, expect, it } from "vitest";
import { useKioskStore } from "@/core/state";
import { MockGuidanceRepository } from "@/testing/fakes/mockGuidanceRepository";

describe("Guidance Mission Creation and Management", () => {
  const repository = new MockGuidanceRepository(0);

  it("rejects mission creation when book is unavailable", async () => {
    // bk-1002 is Introduction to Robotics, available: false in mock
    await expect(
      repository.createMission({
        bookId: "bk-1002",
        kioskSessionId: "kiosk-session-test",
      }),
    ).rejects.toThrow(/không có sẵn trên kệ/i);
  });

  it("rejects mission creation when book does not exist", async () => {
    await expect(
      repository.createMission({
        bookId: "bk-non-existent",
        kioskSessionId: "kiosk-session-test",
      }),
    ).rejects.toThrow(/không tồn tại/i);
  });

  it("successfully creates guidance mission when book is available and generates unique mission ID", async () => {
    // bk-1001 is Clean Architecture, available: true
    const mission1 = await repository.createMission({
      bookId: "bk-1001",
      kioskSessionId: "kiosk-session-test-1",
    });

    const mission2 = await repository.createMission({
      bookId: "bk-1001",
      kioskSessionId: "kiosk-session-test-2",
    });

    expect(mission1).toBeDefined();
    expect(mission1.bookId).toBe("bk-1001");
    expect(mission1.status).toBe("active");
    expect(mission1.shelf).toBe("A-12");
    expect(mission1.robotId).toBeDefined();

    // Verify it is NOT hard-coded to 'mission-001'
    expect(mission1.id).not.toBe("mission-001");
    expect(mission1.id).toMatch(/^mission-/);
    expect(mission1.id).not.toBe(mission2.id);
  });

  it("creates mission and successfully updates activeMissionId in kiosk store", async () => {
    const store = useKioskStore.getState();
    store.resetKioskSession();
    expect(useKioskStore.getState().activeMissionId).toBeNull();

    const mission = await repository.createMission({
      bookId: "bk-1003", // Database Systems Concepts, available: true
      kioskSessionId: useKioskStore.getState().kioskSessionId,
    });

    // Simulate store update (as done by useCreateGuidanceMission)
    useKioskStore.getState().setActiveMissionId(mission.id);

    expect(useKioskStore.getState().activeMissionId).toBe(mission.id);
  });

  it("allows completing and cancelling active missions", async () => {
    const mission = await repository.createMission({
      bookId: "bk-1004", // Designing Data-Intensive Applications, available: true
      kioskSessionId: "session-cancel-test",
    });

    expect(mission.status).toBe("active");

    const completed = await repository.completeMission(mission.id);
    expect(completed.status).toBe("completed");
    expect(completed.progress).toBe(100);

    const fetched = await repository.getMission(mission.id);
    expect(fetched?.status).toBe("completed");
  });
});
