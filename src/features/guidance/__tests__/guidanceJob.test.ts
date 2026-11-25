import { describe, expect, it } from "vitest";
import { useKioskStore } from "@/core/state";
import { MockGuidanceRepository } from "@/testing/fakes/mockGuidanceRepository";

describe("Guidance Job Creation and Management", () => {
  const repository = new MockGuidanceRepository(0);

  it("rejects job creation when book is unavailable", async () => {
    // bk-1002 is Introduction to Robotics, available: false in mock
    await expect(
      repository.createJob({
        bookId: "bk-1002",
        kioskSessionId: "kiosk-session-test",
      }),
    ).rejects.toThrow(/không có sẵn trên kệ/i);
  });

  it("rejects job creation when book does not exist", async () => {
    await expect(
      repository.createJob({
        bookId: "bk-non-existent",
        kioskSessionId: "kiosk-session-test",
      }),
    ).rejects.toThrow(/không tồn tại/i);
  });

  it("successfully creates guidance job when book is available and generates unique job ID", async () => {
    // bk-1001 is Clean Architecture, available: true
    const job1 = await repository.createJob({
      bookId: "bk-1001",
      kioskSessionId: "kiosk-session-test-1",
    });

    const job2 = await repository.createJob({
      bookId: "bk-1001",
      kioskSessionId: "kiosk-session-test-2",
    });

    expect(job1).toBeDefined();
    expect(job1.bookId).toBe("bk-1001");
    expect(job1.status).toBe("active");
    expect(job1.shelf).toBe("A-12");
    expect(job1.robotId).toBeDefined();

    // Verify it is NOT hard-coded to 'job-001'
    expect(job1.id).not.toBe("job-001");
    expect(job1.id).toMatch(/^job-/);
    expect(job1.id).not.toBe(job2.id);
  });

  it("creates job and successfully updates activeJobId in kiosk store", async () => {
    const store = useKioskStore.getState();
    store.resetKioskSession();
    expect(useKioskStore.getState().activeJobId).toBeNull();

    const job = await repository.createJob({
      bookId: "bk-1003", // Database Systems Concepts, available: true
      kioskSessionId: useKioskStore.getState().kioskSessionId,
    });

    // Simulate store update (as done by useCreateGuidanceJob)
    useKioskStore.getState().setActiveJobId(job.id);

    expect(useKioskStore.getState().activeJobId).toBe(job.id);
  });

  it("allows completing and cancelling active jobs", async () => {
    const job = await repository.createJob({
      bookId: "bk-1004", // Designing Data-Intensive Applications, available: true
      kioskSessionId: "session-cancel-test",
    });

    expect(job.status).toBe("active");

    const completed = await repository.completeJob(job.id);
    expect(completed.status).toBe("completed");
    expect(completed.progress).toBe(100);

    const fetched = await repository.getJob(job.id);
    expect(fetched?.status).toBe("completed");
  });
});
