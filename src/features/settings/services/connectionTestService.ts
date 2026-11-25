import axios from "axios";
import { ConnectionTestResult } from "../types/settings.types";

export const connectionTestService = {
  /**
   * Kiểm tra kết nối REST API Server
   */
  async testApiConnection(apiBaseUrl: string): Promise<ConnectionTestResult> {
    const trimmed = apiBaseUrl.trim().replace(/\/+$/, "");
    if (!trimmed) {
      return {
        isTesting: false,
        success: false,
        message: "Chưa nhập API Base URL.",
        testedAt: new Date().toLocaleTimeString(),
      };
    }

    const startTime = Date.now();
    try {
      await axios.get(trimmed, {
        timeout: 4000,
        validateStatus: () => true,
      });

      const latencyMs = Date.now() - startTime;
      return {
        isTesting: false,
        success: true,
        latencyMs,
        message: `REST API hoạt động tốt (${latencyMs}ms)`,
        testedAt: new Date().toLocaleTimeString(),
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg =
        err instanceof Error ? err.message : "Không thể kết nối đến máy chủ";
      return {
        isTesting: false,
        success: false,
        latencyMs,
        message: `Lỗi kết nối REST API: ${errorMsg}`,
        testedAt: new Date().toLocaleTimeString(),
      };
    }
  },

  /**
   * Kiểm tra kết nối SignalR Hub
   */
  async testSignalRConnection(signalRUrl: string): Promise<ConnectionTestResult> {
    const trimmed = signalRUrl.trim().replace(/\/+$/, "");
    if (!trimmed) {
      return {
        isTesting: false,
        success: false,
        message: "Chưa nhập SignalR Hub URL.",
        testedAt: new Date().toLocaleTimeString(),
      };
    }

    const startTime = Date.now();
    try {
      // SignalR hub hỗ trợ endpoint negotiate: POST hoặc GET
      const negotiateUrl = `${trimmed}/negotiate?negotiateVersion=1`;
      await axios.post(
        negotiateUrl,
        {},
        {
          timeout: 4000,
          validateStatus: () => true,
        },
      );

      const latencyMs = Date.now() - startTime;
      return {
        isTesting: false,
        success: true,
        latencyMs,
        message: `SignalR Hub kết nối tốt (${latencyMs}ms)`,
        testedAt: new Date().toLocaleTimeString(),
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg =
        err instanceof Error ? err.message : "Không thể kết nối đến Hub";
      return {
        isTesting: false,
        success: false,
        latencyMs,
        message: `Lỗi kết nối Hub: ${errorMsg}`,
        testedAt: new Date().toLocaleTimeString(),
      };
    }
  },

  /**
   * Kiểm tra kết nối Xiaozhi WebSocket Server
   */
  async testWebSocketConnection(wsUrl: string): Promise<ConnectionTestResult> {
    const trimmed = wsUrl.trim().replace(/\/+$/, "");
    if (!trimmed) {
      return {
        isTesting: false,
        success: false,
        message: "Chưa nhập Xiaozhi WS URL.",
        testedAt: new Date().toLocaleTimeString(),
      };
    }

    if (!/^wss?:\/\//i.test(trimmed)) {
      return {
        isTesting: false,
        success: false,
        message: "URL phải bắt đầu bằng ws:// hoặc wss://",
        testedAt: new Date().toLocaleTimeString(),
      };
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            ws.close();
          } catch {
            // ignore
          }
          resolve({
            isTesting: false,
            success: false,
            latencyMs: Date.now() - startTime,
            message: "Hết thời gian chờ kết nối WebSocket (Timeout 4s)",
            testedAt: new Date().toLocaleTimeString(),
          });
        }
      }, 4000);

      let ws: WebSocket;
      try {
        ws = new WebSocket(trimmed);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const errorMsg = err instanceof Error ? err.message : "Không thể mở kết nối";
        resolve({
          isTesting: false,
          success: false,
          latencyMs: Date.now() - startTime,
          message: `Lỗi mở WebSocket: ${errorMsg}`,
          testedAt: new Date().toLocaleTimeString(),
        });
        return;
      }

      ws.onopen = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          const latencyMs = Date.now() - startTime;
          try {
            ws.close();
          } catch {
            // ignore
          }
          resolve({
            isTesting: false,
            success: true,
            latencyMs,
            message: `WebSocket hoạt động tốt (${latencyMs}ms)`,
            testedAt: new Date().toLocaleTimeString(),
          });
        }
      };

      ws.onerror = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          const latencyMs = Date.now() - startTime;
          try {
            ws.close();
          } catch {
            // ignore
          }
          resolve({
            isTesting: false,
            success: false,
            latencyMs,
            message: "Không thể kết nối đến WebSocket Server",
            testedAt: new Date().toLocaleTimeString(),
          });
        }
      };
    });
  },
};
