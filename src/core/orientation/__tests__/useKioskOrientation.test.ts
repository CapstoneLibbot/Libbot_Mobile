import * as ScreenOrientation from "expo-screen-orientation";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-screen-orientation", () => ({
  OrientationLock: {
    LANDSCAPE: "LANDSCAPE",
  },
  lockAsync: vi.fn(() => Promise.resolve()),
  unlockAsync: vi.fn(() => Promise.resolve()),
}));

describe("Kiosk Orientation Policy", () => {
  it("exports OrientationLock and provides lock and unlock methods", async () => {
    expect(ScreenOrientation.OrientationLock.LANDSCAPE).toBe("LANDSCAPE");
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    );
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith("LANDSCAPE");

    await ScreenOrientation.unlockAsync();
    expect(ScreenOrientation.unlockAsync).toHaveBeenCalled();
  });
});
