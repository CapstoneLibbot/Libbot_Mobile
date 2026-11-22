import { beforeEach, describe, expect, it, vi } from "vitest";
import { secureStorage } from "@/platform/storage";
import { settingsSyncService } from "../services/settingsSyncService";
import { useSettingsStore } from "../state/useSettingsStore";
import { AppSettings, getDefaultSettings } from "../types/settings.types";

vi.mock("@/platform/storage", () => ({
  secureStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../services/settingsSyncService", () => ({
  settingsSyncService: {
    applySettingsToRuntime: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("useSettingsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settings: getDefaultSettings(),
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  });

  it("loads stored settings from secureStorage when initialized", async () => {
    const customSettings: AppSettings = {
      apiBaseUrl: "http://10.0.0.99:5205/api",
      signalRUrl: "http://10.0.0.99:5205/robotHub",
      xiaozhiWsUrl: "ws://10.0.0.99:8000/xiaozhi/v1",
      voiceKioskId: "kiosk-custom-99",
    };

    vi.mocked(secureStorage.get).mockResolvedValueOnce(customSettings);

    await useSettingsStore.getState().init();

    expect(useSettingsStore.getState().settings.apiBaseUrl).toBe("http://10.0.0.99:5205/api");
    expect(useSettingsStore.getState().isInitialized).toBe(true);
    expect(settingsSyncService.applySettingsToRuntime).toHaveBeenCalledWith(customSettings);
  });

  it("falls back to default settings when secureStorage has no saved settings", async () => {
    vi.mocked(secureStorage.get).mockResolvedValueOnce(null);

    await useSettingsStore.getState().init();

    expect(useSettingsStore.getState().settings).toEqual(getDefaultSettings());
    expect(settingsSyncService.applySettingsToRuntime).toHaveBeenCalledWith(getDefaultSettings());
  });

  it("updates settings and saves to secureStorage", async () => {
    const updatedSettings: AppSettings = {
      apiBaseUrl: "http://192.168.1.200:5205/api",
      signalRUrl: "http://192.168.1.200:5205/robotHub",
      xiaozhiWsUrl: "ws://192.168.1.200:8000/xiaozhi/v1",
      voiceKioskId: "libot-updated",
    };

    const success = await useSettingsStore.getState().updateSettings(updatedSettings);

    expect(success).toBe(true);
    expect(secureStorage.set).toHaveBeenCalledWith("libot_runtime_settings", updatedSettings);
    expect(useSettingsStore.getState().settings).toEqual(updatedSettings);
    expect(settingsSyncService.applySettingsToRuntime).toHaveBeenCalledWith(updatedSettings);
  });

  it("resets settings to defaults and removes saved data", async () => {
    await useSettingsStore.getState().resetToDefaults();

    expect(secureStorage.remove).toHaveBeenCalledWith("libot_runtime_settings");
    expect(useSettingsStore.getState().settings).toEqual(getDefaultSettings());
    expect(settingsSyncService.applySettingsToRuntime).toHaveBeenCalledWith(getDefaultSettings());
  });
});
