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
    if (parsed.success) {
      expect(parsed.data.kioskIdleSeconds).toBeGreaterThanOrEqual(5);
      expect(parsed.data.voiceModalInactivitySeconds).toBeGreaterThanOrEqual(5);
      expect(parsed.data.voiceResponseTimeoutSeconds).toBeGreaterThanOrEqual(5);
      expect(parsed.data.feedbackIdleSeconds).toBeGreaterThanOrEqual(5);
    }
  });

  it("validates timeout limits and coerces string numbers", () => {
    const dataWithStrings = {
      apiBaseUrl: "http://192.168.1.50:5205/api",
      signalRUrl: "http://192.168.1.50:5205/robotHub",
      xiaozhiWsUrl: "ws://192.168.1.50:8000/xiaozhi/v1",
      voiceKioskId: "libot-kiosk-test",
      kioskIdleSeconds: "120",
      voiceModalInactivitySeconds: "45",
      voiceResponseTimeoutSeconds: "25",
      feedbackIdleSeconds: "30",
    };

    const parsed = appSettingsSchema.safeParse(dataWithStrings);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kioskIdleSeconds).toBe(120);
      expect(parsed.data.voiceModalInactivitySeconds).toBe(45);
      expect(parsed.data.voiceResponseTimeoutSeconds).toBe(25);
      expect(parsed.data.feedbackIdleSeconds).toBe(30);
    }
  });

  it("rejects timeout values below minimum limit", () => {
    const tooLowData = {
      apiBaseUrl: "http://192.168.1.50:5205/api",
      signalRUrl: "http://192.168.1.50:5205/robotHub",
      xiaozhiWsUrl: "ws://192.168.1.50:8000/xiaozhi/v1",
      voiceKioskId: "libot-kiosk-test",
      kioskIdleSeconds: 2, // < 5 seconds
    };

    const parsed = appSettingsSchema.safeParse(tooLowData);
    expect(parsed.success).toBe(false);
  });
});
