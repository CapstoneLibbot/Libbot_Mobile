import { describe, expect, it } from "vitest";
import { shouldResetOnIdle } from "../useIdleTimeout";

describe("Kiosk Idle Timeout Policy", () => {
  const timeoutMs = 60 * 1000; // 60 seconds

  it("does NOT reset kiosk session when a guidance mission is active, even if idle time has elapsed", () => {
    const activeMissionId = "mission-libot-999";
    const elapsedMs = 120 * 1000; // 2 minutes idle

    const shouldReset = shouldResetOnIdle(
      activeMissionId,
      elapsedMs,
      timeoutMs,
    );
    expect(shouldReset).toBe(false);
  });

  it("does NOT reset kiosk session when idle time has not reached the threshold", () => {
    const activeMissionId = null;
    const elapsedMs = 20 * 1000; // 20 seconds idle (below 60s)

    const shouldReset = shouldResetOnIdle(
      activeMissionId,
      elapsedMs,
      timeoutMs,
    );
    expect(shouldReset).toBe(false);
  });

  it("resets kiosk session when no mission is active and idle time has exceeded threshold", () => {
    const activeMissionId = null;
    const elapsedMs = 65 * 1000; // 65 seconds idle

    const shouldReset = shouldResetOnIdle(
      activeMissionId,
      elapsedMs,
      timeoutMs,
    );
    expect(shouldReset).toBe(true);
  });

  it("treats empty string mission ID as no active mission", () => {
    const activeMissionId = "";
    const elapsedMs = 70 * 1000;

    const shouldReset = shouldResetOnIdle(
      activeMissionId,
      elapsedMs,
      timeoutMs,
    );
    expect(shouldReset).toBe(true);
  });

  it("does NOT reset kiosk session when voice listening modal is active, even if elapsed time exceeded threshold", () => {
    const activeMissionId = null;
    const elapsedMs = 90 * 1000;
    const isVoiceActive = true;

    const shouldReset = shouldResetOnIdle(
      activeMissionId,
      elapsedMs,
      timeoutMs,
      isVoiceActive,
    );
    expect(shouldReset).toBe(false);
  });
});
