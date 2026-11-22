import { appQueryClient } from "@/core/providers/QueryProvider";
import { setPlatformApiBaseUrl } from "@/platform/http/axiosClient";
import { signalRClient } from "@/platform/realtime/signalRClient";
import { setApiBaseUrl } from "@/services/api/client";
import { AppSettings } from "../types/settings.types";

export const settingsSyncService = {
  /**
   * Đồng bộ ngay lập tức các client (Axios, SignalR, QueryClient) với cấu hình mới
   */
  async applySettingsToRuntime(settings: AppSettings): Promise<void> {
    const { apiBaseUrl, signalRUrl } = settings;

    // 1. Cập nhật Axios clients
    setApiBaseUrl(apiBaseUrl);
    setPlatformApiBaseUrl(apiBaseUrl);

    // 2. Tái kết nối SignalR với URL Hub mới
    try {
      await signalRClient.reconnectWithUrl(signalRUrl);
    } catch (error) {
      if (__DEV__) {
        console.warn("[settingsSyncService] Không thể kết nối SignalR với Hub mới:", error);
      }
    }

    // 3. Xóa cache React Query để tránh xung đột dữ liệu từ server cũ
    try {
      appQueryClient.clear();
    } catch (error) {
      if (__DEV__) {
        console.warn("[settingsSyncService] Lỗi khi xóa QueryClient cache:", error);
      }
    }
  },
};
