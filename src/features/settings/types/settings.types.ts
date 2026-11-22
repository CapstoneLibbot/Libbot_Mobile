import { z } from "zod";
import { env } from "@/config/env";

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
  };
}
