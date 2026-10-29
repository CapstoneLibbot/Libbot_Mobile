import { z } from "zod";

const urlSchema = z.string().url("Phải là một URL hợp lệ");

export interface AppEnv {
  apiBaseUrl?: string;
  signalRUrl?: string;
  xiaozhiWsUrl?: string;
  voiceKioskId?: string;
  isMock: boolean;
  isDev: boolean;
  isProduction: boolean;
}

function validateWebSocketUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== "string") return undefined;

  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `Định dạng Xiaozhi WebSocket không hợp lệ: "${rawUrl}". URL phải bắt đầu bằng ws:// hoặc wss://.`,
    );
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error(
      `Định dạng Xiaozhi WebSocket không hợp lệ: "${rawUrl}". URL phải bắt đầu bằng ws:// hoặc wss://.`,
    );
  }
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    throw new Error(
      "Xiaozhi WebSocket trên Android phải dùng địa chỉ LAN, không dùng localhost.",
    );
  }
  return trimmed;
}

/**
 * Validates and normalizes URL by trimming whitespace and removing trailing slashes.
 */
export function validateAndFormatUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== "string") {
    return undefined;
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return undefined;
  }
  const parsed = urlSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new Error(
      `Định dạng URL không hợp lệ: "${rawUrl}". URL phải bắt đầu bằng http:// hoặc https://.`,
    );
  }
  return trimmed;
}

/**
 * Parses and validates environment variables.
 * In development: allows mock mode if no API URL is provided.
 * In production: throws a descriptive error if API URL is missing or invalid.
 */
export function parseEnv(
  rawEnv: Record<string, string | undefined> = {},
): AppEnv {
  const isProduction = rawEnv.NODE_ENV === "production";
  const rawApiBaseUrl = rawEnv.EXPO_PUBLIC_API_BASE_URL;
  const rawSignalRUrl = rawEnv.EXPO_PUBLIC_SIGNALR_URL;
  const xiaozhiWsUrl = validateWebSocketUrl(rawEnv.EXPO_PUBLIC_XIAOZHI_WS_URL);
  const voiceKioskId = rawEnv.EXPO_PUBLIC_VOICE_KIOSK_ID?.trim() || undefined;

  if (isProduction) {
    if (!rawApiBaseUrl || !rawApiBaseUrl.trim()) {
      throw new Error(
        "Thiếu biến môi trường EXPO_PUBLIC_API_BASE_URL trong môi trường production. Vui lòng cung cấp URL LAN hoặc HTTPS hợp lệ.",
      );
    }
    const apiBaseUrl = validateAndFormatUrl(rawApiBaseUrl);
    const signalRUrl = rawSignalRUrl
      ? validateAndFormatUrl(rawSignalRUrl)
      : undefined;

    return {
      apiBaseUrl,
      signalRUrl,
      xiaozhiWsUrl,
      voiceKioskId,
      isMock: false,
      isDev: false,
      isProduction: true,
    };
  }

  // Development & Test environments
  let apiBaseUrl: string | undefined;
  let signalRUrl: string | undefined;

  if (rawApiBaseUrl && rawApiBaseUrl.trim()) {
    apiBaseUrl = validateAndFormatUrl(rawApiBaseUrl);
  }

  if (rawSignalRUrl && rawSignalRUrl.trim()) {
    signalRUrl = validateAndFormatUrl(rawSignalRUrl);
  }

  const isMock = !apiBaseUrl;

  return {
    apiBaseUrl,
    signalRUrl,
    xiaozhiWsUrl,
    voiceKioskId,
    isMock,
    isDev: !isProduction,
    isProduction: false,
  };
}

// Expo replaces EXPO_PUBLIC_* only when each key is referenced directly at
// bundle time. Passing the whole process.env object works in Metro, but makes
// a standalone APK receive an empty object and crash in production.
export const env: AppEnv = parseEnv({
  NODE_ENV: process.env.NODE_ENV,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_SIGNALR_URL: process.env.EXPO_PUBLIC_SIGNALR_URL,
  EXPO_PUBLIC_XIAOZHI_WS_URL: process.env.EXPO_PUBLIC_XIAOZHI_WS_URL,
  EXPO_PUBLIC_VOICE_KIOSK_ID: process.env.EXPO_PUBLIC_VOICE_KIOSK_ID,
});
