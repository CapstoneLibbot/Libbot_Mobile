import { updateKioskTimeoutConfig } from "@/core/config/kioskTimeoutConfig";
import { appQueryClient } from "@/core/providers/QueryProvider";
import { setPlatformApiBaseUrl } from "@/platform/http/axiosClient";
import { signalRClient } from "@/platform/realtime/signalRClient";
import { setApiBaseUrl } from "@/services/api/client";
import { AppSettings } from "../types/settings.types";

export const settingsSyncService = {
  /**
   * Đồng bộ ngay lập tức các client (Axios, SignalR, QueryClient, Timeouts) với cấu hình mới
   */
  async applySettingsToRuntime(settings: AppSettings): Promise<void> {
    const {
      apiBaseUrl,
      signalRUrl,
      kioskIdleSeconds,
      voiceModalInactivitySeconds,
      voiceResponseTimeoutSeconds,
      feedbackIdleSeconds,
    } = settings;

    // 1. Cập nhật Axios clients
    setApiBaseUrl(apiBaseUrl);
    setPlatformApiBaseUrl(apiBaseUrl);

    // 2. Cập nhật Timeouts cho toàn bộ hệ thống Kiosk in-memory
    updateKioskTimeoutConfig({
      kioskIdleSeconds,
      voiceModalInactivitySeconds,
      voiceResponseTimeoutSeconds,
      feedbackIdleSeconds,
    });

    // 3. Tái kết nối SignalR với URL Hub mới
    try {
      await signalRClient.reconnectWithUrl(signalRUrl);
    } catch (error) {
      if (__DEV__) {
        console.warn("[settingsSyncService] Không thể kết nối SignalR với Hub mới:", error);
      }
    }

    // 4. Xóa cache React Query để tránh xung đột dữ liệu từ server cũ
    try {
      appQueryClient.clear();
    } catch (error) {
      if (__DEV__) {
        console.warn("[settingsSyncService] Lỗi khi xóa QueryClient cache:", error);
      }
    }
  },
};
