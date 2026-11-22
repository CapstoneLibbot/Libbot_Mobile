import { describe, expect, it } from "vitest";
import { appSettingsSchema, getDefaultSettings } from "../types/settings.types";

describe("settingsValidation", () => {
  it("accepts valid http and https URLs and trims trailing slashes", () => {
    const validData = {
      apiBaseUrl: "http://192.168.1.50:5205/api///",
      signalRUrl: "https://myserver.com/robotHub/",
      xiaozhiWsUrl: "ws://192.168.1.50:8000/xiaozhi/v1/",
      voiceKioskId: "libot-kiosk-test",
    };

    const parsed = appSettingsSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.apiBaseUrl).toBe("http://192.168.1.50:5205/api");
      expect(parsed.data.signalRUrl).toBe("https://myserver.com/robotHub");
      expect(parsed.data.xiaozhiWsUrl).toBe("ws://192.168.1.50:8000/xiaozhi/v1");
      expect(parsed.data.voiceKioskId).toBe("libot-kiosk-test");
    }
  });

  it("rejects non-http API base URL", () => {
    const invalidData = {
      apiBaseUrl: "ftp://192.168.1.50:5205/api",
      signalRUrl: "http://192.168.1.50:5205/robotHub",
      xiaozhiWsUrl: "ws://192.168.1.50:8000/xiaozhi/v1/",
      voiceKioskId: "libot-kiosk-test",
    };

    const parsed = appSettingsSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it("rejects non-ws Xiaozhi URL", () => {
    const invalidData = {
      apiBaseUrl: "http://192.168.1.50:5205/api",
      signalRUrl: "http://192.168.1.50:5205/robotHub",
      xiaozhiWsUrl: "http://192.168.1.50:8000/xiaozhi/v1/",
      voiceKioskId: "libot-kiosk-test",
    };

    const parsed = appSettingsSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it("returns defaults matching schema", () => {
    const defaults = getDefaultSettings();
    const parsed = appSettingsSchema.safeParse(defaults);
    expect(parsed.success).toBe(true);
  });
});
