import { create } from "zustand";
import { secureStorage } from "@/platform/storage";
import { settingsSyncService } from "../services/settingsSyncService";
import {
  AppSettings,
  appSettingsSchema,
  getDefaultSettings,
} from "../types/settings.types";

const SETTINGS_STORAGE_KEY = "libot_runtime_settings";

export interface SettingsState {
  settings: AppSettings;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  updateSettings: (newSettings: AppSettings) => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: getDefaultSettings(),
  isInitialized: false,
  isLoading: false,
  error: null,

  init: async () => {
    if (get().isInitialized) return;

    try {
      set({ isLoading: true, error: null });
      const stored = await secureStorage.get<AppSettings>(SETTINGS_STORAGE_KEY);

      if (stored) {
        const parsed = appSettingsSchema.safeParse(stored);
        if (parsed.success) {
          set({ settings: parsed.data, isInitialized: true, isLoading: false });
          await settingsSyncService.applySettingsToRuntime(parsed.data);
          return;
        }
      }

      // Chưa có cài đặt tùy chỉnh -> dùng cấu hình mặc định từ .env
      const defaults = getDefaultSettings();
      set({ settings: defaults, isInitialized: true, isLoading: false });
      await settingsSyncService.applySettingsToRuntime(defaults);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Lỗi khi tải cấu hình cài đặt";
      set({
        settings: getDefaultSettings(),
        isInitialized: true,
        isLoading: false,
        error: message,
      });
    }
  },

  updateSettings: async (newSettings: AppSettings) => {
    try {
      set({ isLoading: true, error: null });
      const parsed = appSettingsSchema.safeParse(newSettings);
      if (!parsed.success) {
        set({
          isLoading: false,
          error: parsed.error.issues[0]?.message || "Dữ liệu cấu hình không hợp lệ",
        });
        return false;
      }

      const validated = parsed.data;
      await secureStorage.set(SETTINGS_STORAGE_KEY, validated);
      set({ settings: validated, isLoading: false, error: null });

      // Áp dụng ngay lập tức cấu hình mới vào runtime
      await settingsSyncService.applySettingsToRuntime(validated);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Lỗi khi lưu cấu hình";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  resetToDefaults: async () => {
    try {
      set({ isLoading: true, error: null });
      await secureStorage.remove(SETTINGS_STORAGE_KEY);
      const defaults = getDefaultSettings();
      set({ settings: defaults, isLoading: false, error: null });

      await settingsSyncService.applySettingsToRuntime(defaults);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Lỗi khi khôi phục cấu hình";
      set({ isLoading: false, error: message });
    }
  },
}));
