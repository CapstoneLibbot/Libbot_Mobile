import { z } from "zod";
import { env } from "@/config/env";
import { kioskTimeoutConfig } from "@/core/config/kioskTimeoutConfig";

export const appSettingsSchema = z.object({
  apiBaseUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập API Base URL")
    .refine(
      (val) => /^https?:\/\//i.test(val),
      "API Base URL phải bắt đầu bằng http:// hoặc https://",
    )
    .transform((val) => val.replace(/\/+$/, "")),
  signalRUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập SignalR URL")
    .refine(
      (val) => /^https?:\/\//i.test(val),
      "SignalR URL phải bắt đầu bằng http:// hoặc https://",
    )
    .transform((val) => val.replace(/\/+$/, "")),
  xiaozhiWsUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập Xiaozhi WebSocket URL")
    .refine(
      (val) => /^wss?:\/\//i.test(val),
      "Xiaozhi URL phải bắt đầu bằng ws:// hoặc wss://",
    )
    .transform((val) => val.replace(/\/+$/, "")),
  voiceKioskId: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập Voice Kiosk ID"),

  // Cấu hình thời gian chờ & tương tác (giây)
  kioskIdleSeconds: z.coerce
    .number()
    .positive("Thời gian chờ phải lớn hơn 0")
    .min(5, "Tối thiểu 5 giây")
    .max(3600, "Tối đa 3600 giây (1 giờ)")
    .default(60),
  voiceModalInactivitySeconds: z.coerce
    .number()
    .positive("Thời gian chờ phải lớn hơn 0")
    .min(5, "Tối thiểu 5 giây")
    .max(600, "Tối đa 600 giây (10 phút)")
    .default(60),
  voiceResponseTimeoutSeconds: z.coerce
    .number()
    .positive("Thời gian chờ phải lớn hơn 0")
    .min(5, "Tối thiểu 5 giây")
    .max(180, "Tối đa 180 giây (3 phút)")
    .default(30),
  feedbackIdleSeconds: z.coerce
    .number()
    .positive("Thời gian chờ phải lớn hơn 0")
    .min(5, "Tối thiểu 5 giây")
    .max(300, "Tối đa 300 giây (5 phút)")
    .default(45),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export type FieldTestStatus = "idle" | "testing" | "success" | "error";

export interface FieldTestState {
  status: FieldTestStatus;
  message?: string;
  latencyMs?: number;
  testedAt?: string;
}

export interface ConnectionTestResult {
  isTesting: boolean;
  success: boolean | null;
  message: string;
  latencyMs?: number;
  testedAt?: string;
}

export function getDefaultSettings(): AppSettings {
  return {
    apiBaseUrl: (env.apiBaseUrl || "http://192.168.100.43:5205/api").replace(/\/+$/, ""),
    signalRUrl: (env.signalRUrl || "http://192.168.100.43:5205/robotHub").replace(/\/+$/, ""),
    xiaozhiWsUrl: (env.xiaozhiWsUrl || "ws://192.168.100.43:8000/xiaozhi/v1/").replace(/\/+$/, ""),
    voiceKioskId: env.voiceKioskId || "libot-kiosk-01",
    kioskIdleSeconds: kioskTimeoutConfig.kioskIdleSeconds ?? 60,
    voiceModalInactivitySeconds: kioskTimeoutConfig.voiceModalInactivitySeconds ?? 60,
    voiceResponseTimeoutSeconds: kioskTimeoutConfig.voiceResponseTimeoutSeconds ?? 30,
    feedbackIdleSeconds: kioskTimeoutConfig.feedbackIdleSeconds ?? 45,
  };
}
