import { z } from "zod";

export const runtimeConfigSchema = z.object({
  appName: z.string().default("LiBot Kiosk"),
  apiBaseUrl: z.string().url().default("http://localhost:5000/api"),
  signalRUrl: z.string().url().default("http://localhost:5000/hubs"),
  mapProvider: z.enum(["google", "apple", "mock"]).default("google"),
  idleTimeoutSeconds: z.number().positive().default(60),
  isDev: z.boolean().default(true),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema> & {
  apiUrl: string;
};

export function parseRuntimeConfig(
  rawEnv: Record<string, string | undefined> = {},
): RuntimeConfig {
  const result = runtimeConfigSchema.safeParse({
    appName: "LiBot Kiosk",
    apiBaseUrl: rawEnv.EXPO_PUBLIC_API_URL || "http://localhost:5000/api",
    signalRUrl: rawEnv.EXPO_PUBLIC_SIGNALR_URL || "http://localhost:5000/hubs",
    mapProvider: rawEnv.EXPO_PUBLIC_MAP_PROVIDER || "google",
    idleTimeoutSeconds: rawEnv.EXPO_PUBLIC_IDLE_TIMEOUT_SECONDS
      ? Number(rawEnv.EXPO_PUBLIC_IDLE_TIMEOUT_SECONDS)
      : 60,
    isDev: rawEnv.NODE_ENV !== "production",
  });

  if (!result.success) {
    const fallback = runtimeConfigSchema.parse({});
    return {
      ...fallback,
      apiUrl: fallback.apiBaseUrl,
    };
  }

  return {
    ...result.data,
    apiUrl: result.data.apiBaseUrl,
  };
}

export const runtimeConfig: RuntimeConfig = parseRuntimeConfig(process.env);
