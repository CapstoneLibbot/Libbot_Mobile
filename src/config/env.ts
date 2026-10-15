import { z } from "zod";

const urlSchema = z.string().url("Phải là một URL hợp lệ");

export interface AppEnv {
  apiBaseUrl?: string;
  signalRUrl?: string;
  isMock: boolean;
  isDev: boolean;
  isProduction: boolean;
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
    isMock,
    isDev: !isProduction,
    isProduction: false,
  };
}

export const env: AppEnv = parseEnv(process.env);
