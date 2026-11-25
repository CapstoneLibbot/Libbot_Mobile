import { z } from "zod";

export const kioskTimeoutConfigSchema = z.object({
  // Global kiosk inactivity timeout (seconds): when user is inactive, no active mission and no voice modal, return to /(kiosk)/idle
  kioskIdleSeconds: z.number().positive().default(60),
  // Voice modal inactivity timeout (seconds): when modal is in listening status and unmuted, auto-close after silence
  voiceModalInactivitySeconds: z.number().positive().default(60),
  // Voice session response timeout (seconds): max wait for AI response before alerting error
  voiceResponseTimeoutSeconds: z.number().positive().default(30),
  // Feedback screen inactivity timeout (seconds): auto-skip to idle if abandoned
  feedbackIdleSeconds: z.number().positive().default(45),
  // Feedback submission success redirect delay (seconds)
  feedbackSuccessDelaySeconds: z.number().nonnegative().default(1),
});

export type RawKioskTimeoutConfig = z.infer<typeof kioskTimeoutConfigSchema>;

export interface KioskTimeoutConfig extends RawKioskTimeoutConfig {
  kioskIdleMs: number;
  voiceModalInactivityMs: number;
  voiceResponseMs: number;
  feedbackIdleMs: number;
  feedbackSuccessDelayMs: number;
}

export function parseKioskTimeoutConfig(
  rawEnv: Record<string, string | undefined> = {},
): KioskTimeoutConfig {
  const parseNumber = (val: string | undefined): number | undefined => {
    if (val === undefined || val.trim() === "") return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : undefined;
  };

  const candidate = {
    kioskIdleSeconds: parseNumber(rawEnv.EXPO_PUBLIC_IDLE_TIMEOUT_SECONDS),
    voiceModalInactivitySeconds: parseNumber(
      rawEnv.EXPO_PUBLIC_VOICE_MODAL_TIMEOUT_SECONDS,
    ),
    voiceResponseTimeoutSeconds: parseNumber(
      rawEnv.EXPO_PUBLIC_VOICE_RESPONSE_TIMEOUT_SECONDS,
    ),
    feedbackIdleSeconds: parseNumber(
      rawEnv.EXPO_PUBLIC_FEEDBACK_TIMEOUT_SECONDS,
    ),
    feedbackSuccessDelaySeconds: parseNumber(
      rawEnv.EXPO_PUBLIC_FEEDBACK_SUCCESS_DELAY_SECONDS,
    ),
  };

  const parsed = kioskTimeoutConfigSchema.safeParse(candidate);
  const data = parsed.success
    ? parsed.data
    : kioskTimeoutConfigSchema.parse({});

  return {
    ...data,
    kioskIdleMs: Math.round(data.kioskIdleSeconds * 1000),
    voiceModalInactivityMs: Math.round(data.voiceModalInactivitySeconds * 1000),
    voiceResponseMs: Math.round(data.voiceResponseTimeoutSeconds * 1000),
    feedbackIdleMs: Math.round(data.feedbackIdleSeconds * 1000),
    feedbackSuccessDelayMs: Math.round(data.feedbackSuccessDelaySeconds * 1000),
  };
}

export const kioskTimeoutConfig: KioskTimeoutConfig = parseKioskTimeoutConfig(
  process.env,
);

/**
 * Cập nhật cấu hình timeout in-memory ngay lập tức trong runtime khi người dùng thay đổi Settings.
 */
export function updateKioskTimeoutConfig(
  updates: Partial<RawKioskTimeoutConfig>,
): KioskTimeoutConfig {
  const merged = {
    kioskIdleSeconds:
      updates.kioskIdleSeconds ?? kioskTimeoutConfig.kioskIdleSeconds,
    voiceModalInactivitySeconds:
      updates.voiceModalInactivitySeconds ??
      kioskTimeoutConfig.voiceModalInactivitySeconds,
    voiceResponseTimeoutSeconds:
      updates.voiceResponseTimeoutSeconds ??
      kioskTimeoutConfig.voiceResponseTimeoutSeconds,
    feedbackIdleSeconds:
      updates.feedbackIdleSeconds ?? kioskTimeoutConfig.feedbackIdleSeconds,
    feedbackSuccessDelaySeconds:
      updates.feedbackSuccessDelaySeconds ??
      kioskTimeoutConfig.feedbackSuccessDelaySeconds,
  };

  const parsed = kioskTimeoutConfigSchema.safeParse(merged);
  const data = parsed.success
    ? parsed.data
    : kioskTimeoutConfigSchema.parse({});

  kioskTimeoutConfig.kioskIdleSeconds = data.kioskIdleSeconds;
  kioskTimeoutConfig.voiceModalInactivitySeconds =
    data.voiceModalInactivitySeconds;
  kioskTimeoutConfig.voiceResponseTimeoutSeconds =
    data.voiceResponseTimeoutSeconds;
  kioskTimeoutConfig.feedbackIdleSeconds = data.feedbackIdleSeconds;
  kioskTimeoutConfig.feedbackSuccessDelaySeconds =
    data.feedbackSuccessDelaySeconds;

  kioskTimeoutConfig.kioskIdleMs = Math.round(data.kioskIdleSeconds * 1000);
  kioskTimeoutConfig.voiceModalInactivityMs = Math.round(
    data.voiceModalInactivitySeconds * 1000,
  );
  kioskTimeoutConfig.voiceResponseMs = Math.round(
    data.voiceResponseTimeoutSeconds * 1000,
  );
  kioskTimeoutConfig.feedbackIdleMs = Math.round(
    data.feedbackIdleSeconds * 1000,
  );
  kioskTimeoutConfig.feedbackSuccessDelayMs = Math.round(
    data.feedbackSuccessDelaySeconds * 1000,
  );

  return kioskTimeoutConfig;
}
