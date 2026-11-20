import { describe, expect, it } from "vitest";
import { parseKioskTimeoutConfig } from "../kioskTimeoutConfig";

describe("Kiosk Timeout Configuration (src/core/config/kioskTimeoutConfig)", () => {
  it("loads valid default configuration when environment is empty", () => {
    const config = parseKioskTimeoutConfig({});

    expect(config.kioskIdleSeconds).toBe(60);
    expect(config.kioskIdleMs).toBe(60000);

    expect(config.voiceModalInactivitySeconds).toBe(60);
    expect(config.voiceModalInactivityMs).toBe(60000);

    expect(config.voiceResponseTimeoutSeconds).toBe(30);
    expect(config.voiceResponseMs).toBe(30000);

    expect(config.feedbackIdleSeconds).toBe(45);
    expect(config.feedbackIdleMs).toBe(45000);

    expect(config.feedbackSuccessDelaySeconds).toBe(1);
    expect(config.feedbackSuccessDelayMs).toBe(1000);
  });

  it("correctly parses custom valid environment variables", () => {
    const config = parseKioskTimeoutConfig({
      EXPO_PUBLIC_IDLE_TIMEOUT_SECONDS: "90",
      EXPO_PUBLIC_VOICE_MODAL_TIMEOUT_SECONDS: "45",
      EXPO_PUBLIC_VOICE_RESPONSE_TIMEOUT_SECONDS: "20",
      EXPO_PUBLIC_FEEDBACK_TIMEOUT_SECONDS: "30",
      EXPO_PUBLIC_FEEDBACK_SUCCESS_DELAY_SECONDS: "2",
    });

    expect(config.kioskIdleSeconds).toBe(90);
    expect(config.kioskIdleMs).toBe(90000);

    expect(config.voiceModalInactivitySeconds).toBe(45);
    expect(config.voiceModalInactivityMs).toBe(45000);

    expect(config.voiceResponseTimeoutSeconds).toBe(20);
    expect(config.voiceResponseMs).toBe(20000);

    expect(config.feedbackIdleSeconds).toBe(30);
    expect(config.feedbackIdleMs).toBe(30000);

    expect(config.feedbackSuccessDelaySeconds).toBe(2);
    expect(config.feedbackSuccessDelayMs).toBe(2000);
  });

  it("safely falls back to defaults when environment variables contain invalid non-numeric values", () => {
    const config = parseKioskTimeoutConfig({
      EXPO_PUBLIC_IDLE_TIMEOUT_SECONDS: "not-a-number",
      EXPO_PUBLIC_VOICE_MODAL_TIMEOUT_SECONDS: "-10",
      EXPO_PUBLIC_VOICE_RESPONSE_TIMEOUT_SECONDS: "abc",
      EXPO_PUBLIC_FEEDBACK_TIMEOUT_SECONDS: "0", // 0 is invalid for positive()
    });

    expect(config.kioskIdleSeconds).toBe(60);
    expect(config.voiceModalInactivitySeconds).toBe(60);
    expect(config.voiceResponseTimeoutSeconds).toBe(30);
    expect(config.feedbackIdleSeconds).toBe(45);
  });
});
