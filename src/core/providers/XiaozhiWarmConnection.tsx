import { useEffect, useRef } from "react";
import { env } from "@/config";
import { useSettingsStore } from "@/features/settings/state/useSettingsStore";
import { useNetworkStatus } from "@/platform/network";
import XiaozhiAudio, { addXiaozhiEventListener } from "xiaozhi-audio";

const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Giữ một WebSocket connection sẵn sàng tới Xiaozhi server khi kiosk hoạt động.
 * - Không mở microphone, chỉ mở sẵn kênh truyền tải WebSocket để người dùng chạm hoặc nói Wake Word là tương tác được ngay.
 * - Tự động dừng reconnect khi thiết bị mất kết nối mạng.
 * - Áp dụng exponential backoff khi gặp sự cố mạng (2s -> 4s -> 8s -> tối đa 30s).
 */
export function XiaozhiWarmConnection(): null {
  const { isConnected } = useNetworkStatus();
  const retryAttemptRef = useRef(0);
  const xiaozhiWsUrl = useSettingsStore((s) => s.settings.xiaozhiWsUrl) || env.xiaozhiWsUrl;
  const voiceKioskId = useSettingsStore((s) => s.settings.voiceKioskId) || env.voiceKioskId;

  useEffect(() => {
    const audio = XiaozhiAudio;
    if (!audio || !xiaozhiWsUrl || !voiceKioskId || !isConnected) {
      return;
    }

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const warm = () => {
      if (disposed) return;
      void audio
        .connect(xiaozhiWsUrl, voiceKioskId)
        .then(() => {
          retryAttemptRef.current = 0;
        })
        .catch(() => {
          if (!disposed) {
            const delay = Math.min(
              INITIAL_RECONNECT_DELAY_MS * 2 ** retryAttemptRef.current,
              MAX_RECONNECT_DELAY_MS,
            );
            retryAttemptRef.current += 1;
            reconnectTimer = setTimeout(warm, delay);
          }
        });
    };

    const subscription = addXiaozhiEventListener((event) => {
      if (event.type === "session_ended" || event.type === "disconnected") {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        retryAttemptRef.current = 0;
        // Allow a 2s quiet window after reader session ends so Vosk wake-word listener can reclaim mic smoothly
        reconnectTimer = setTimeout(warm, INITIAL_RECONNECT_DELAY_MS);
      }
    });

    warm();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      subscription?.remove();
      void audio.disconnect();
    };
  }, [isConnected, xiaozhiWsUrl, voiceKioskId]);

  return null;
}
