import { beforeEach, describe, expect, it, vi } from "vitest";
import * as SecureStore from "expo-secure-store";
import { secureStorage } from "../secureStorage";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe("secureStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes keys to ensure valid SecureStore key format without colons", async () => {
    const rawKey = "libot_runtime_settings";
    const testData = { foo: "bar" };

    await secureStorage.set(rawKey, testData);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "libot_kiosk_libot_runtime_settings",
      JSON.stringify(testData),
    );
  });

  it("retrieves and parses JSON values correctly", async () => {
    const rawKey = "test_key";
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(
      JSON.stringify({ value: 123 }),
    );

    const result = await secureStorage.get<{ value: number }>(rawKey);

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("libot_kiosk_test_key");
    expect(result).toEqual({ value: 123 });
  });

  it("falls back to memory map if SecureStore throws", async () => {
    const rawKey = "fallback_key";
    const data = { token: "abc-123" };

    vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(
      new Error("Keystore unavailable"),
    );

    await secureStorage.set(rawKey, data);

    // Retrieve should read from in-memory fallback even if SecureStore fails
    vi.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(
      new Error("Keystore unavailable"),
    );

    const retrieved = await secureStorage.get<{ token: string }>(rawKey);
    expect(retrieved).toEqual(data);
  });

  it("deletes key properly", async () => {
    await secureStorage.remove("some_key");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("libot_kiosk_some_key");
  });
});
