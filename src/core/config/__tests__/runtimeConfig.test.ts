import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "../runtimeConfig";

describe("Runtime Configuration Validation", () => {
  it("loads valid default configuration when environment is empty", () => {
    const config = parseRuntimeConfig({});
    expect(config.appName).toBe("LiBot Kiosk");
    expect(config.apiBaseUrl).toBe("http://localhost:5000/api");
    expect(config.apiUrl).toBe("http://localhost:5000/api");
    expect(config.signalRUrl).toBe("http://localhost:5000/hubs");
    expect(config.mapProvider).toBe("google");
    expect(config.idleTimeoutSeconds).toBe(60);
    expect(config.isDev).toBe(true);
  });

  it("parses valid custom environment variables", () => {
    const config = parseRuntimeConfig({
      EXPO_PUBLIC_API_URL: "https://libot.library.org/api",
      EXPO_PUBLIC_SIGNALR_URL: "https://libot.library.org/hubs",
      EXPO_PUBLIC_MAP_PROVIDER: "apple",
      EXPO_PUBLIC_IDLE_TIMEOUT_SECONDS: "90",
      NODE_ENV: "production",
    });

    expect(config.apiBaseUrl).toBe("https://libot.library.org/api");
    expect(config.apiUrl).toBe("https://libot.library.org/api");
    expect(config.signalRUrl).toBe("https://libot.library.org/hubs");
    expect(config.mapProvider).toBe("apple");
    expect(config.idleTimeoutSeconds).toBe(90);
    expect(config.isDev).toBe(false);
  });

  it("safely falls back to defaults when URL is malformed", () => {
    const config = parseRuntimeConfig({
      EXPO_PUBLIC_API_URL: "not-a-valid-url",
      EXPO_PUBLIC_SIGNALR_URL: "invalid-hubs",
    });

    expect(config.apiBaseUrl).toBe("http://localhost:5000/api");
    expect(config.signalRUrl).toBe("http://localhost:5000/hubs");
  });

  it("safely falls back when map provider is invalid", () => {
    const config = parseRuntimeConfig({
      EXPO_PUBLIC_MAP_PROVIDER: "unknown-map",
    });

    expect(config.mapProvider).toBe("google");
  });
});
