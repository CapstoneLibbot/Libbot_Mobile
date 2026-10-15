import { describe, expect, it } from "vitest";
import { parseEnv, validateAndFormatUrl } from "../env";

describe("env configuration and validation (src/config/env.ts)", () => {
  it("accepts a valid LAN URL and normalizes it", () => {
    const lanUrl = "http://192.168.1.8:5205/api";
    const result = validateAndFormatUrl(lanUrl);
    expect(result).toBe("http://192.168.1.8:5205/api");

    const env = parseEnv({
      NODE_ENV: "development",
      EXPO_PUBLIC_API_BASE_URL: lanUrl,
    });
    expect(env.isMock).toBe(false);
    expect(env.apiBaseUrl).toBe("http://192.168.1.8:5205/api");
  });

  it("accepts a valid HTTPS URL and normalizes it", () => {
    const httpsUrl = "https://libot.example.com/api";
    const result = validateAndFormatUrl(httpsUrl);
    expect(result).toBe("https://libot.example.com/api");

    const env = parseEnv({
      NODE_ENV: "development",
      EXPO_PUBLIC_API_BASE_URL: httpsUrl,
    });
    expect(env.isMock).toBe(false);
    expect(env.apiBaseUrl).toBe("https://libot.example.com/api");
  });

  it("strips trailing slashes from URLs", () => {
    const urlWithSlash = "http://192.168.1.8:5205/api/";
    const urlWithMultipleSlashes = "https://libot.example.com/api///";

    expect(validateAndFormatUrl(urlWithSlash)).toBe(
      "http://192.168.1.8:5205/api",
    );
    expect(validateAndFormatUrl(urlWithMultipleSlashes)).toBe(
      "https://libot.example.com/api",
    );

    const env = parseEnv({
      NODE_ENV: "development",
      EXPO_PUBLIC_API_BASE_URL: urlWithSlash,
      EXPO_PUBLIC_SIGNALR_URL: "http://192.168.1.8:5205/robotHub/",
    });
    expect(env.apiBaseUrl).toBe("http://192.168.1.8:5205/api");
    expect(env.signalRUrl).toBe("http://192.168.1.8:5205/robotHub");
  });

  it("throws an error in production when EXPO_PUBLIC_API_BASE_URL is missing", () => {
    expect(() => {
      parseEnv({
        NODE_ENV: "production",
      });
    }).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it("throws an error in production when EXPO_PUBLIC_API_BASE_URL is invalid", () => {
    expect(() => {
      parseEnv({
        NODE_ENV: "production",
        EXPO_PUBLIC_API_BASE_URL: "not-a-valid-url",
      });
    }).toThrow(/không hợp lệ/);
  });

  it("enables mock mode in development when no API URL is configured", () => {
    const devEnv = parseEnv({
      NODE_ENV: "development",
    });
    expect(devEnv.isMock).toBe(true);
    expect(devEnv.apiBaseUrl).toBeUndefined();
    expect(devEnv.isDev).toBe(true);
  });
});
