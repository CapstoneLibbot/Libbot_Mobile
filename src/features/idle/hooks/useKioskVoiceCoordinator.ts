import { useCallback, useEffect, useRef, useState } from "react";
import { type WakeWordPhase } from "../domain/wakeWordState";
import {
  computeKioskVoiceStatusLabel,
  DEFAULT_VOICE_SETTLE_DELAY_MS,
  INITIAL_KIOSK_VOICE_STATE,
  kioskVoiceStateTransitions,
  type KioskVoiceCoordinatorState,
} from "../domain/kioskVoiceCoordinatorState";
import { useWakeWord } from "../wakeword";

export {
  computeKioskVoiceStatusLabel,
  DEFAULT_VOICE_SETTLE_DELAY_MS,
  INITIAL_KIOSK_VOICE_STATE,
  kioskVoiceStateTransitions,
  type KioskVoiceCoordinatorState,
};

export interface UseKioskVoiceCoordinatorOptions {
  isConnected: boolean;
  onRecordInteraction: () => void;
  settleDelayMs?: number;
}

export interface UseKioskVoiceCoordinatorReturn {
  isVoiceModalOpen: boolean;
  voiceActivation: "manual" | "wake";
  wakeWordPhase: WakeWordPhase;
  statusLabel: string;
  openManualVoice: () => void;
  closeVoice: () => void;
  handleWakeWordDetected: (keyword: string) => void;
}

/**
 * Coordinator điều phối vòng đời âm thanh giữa:
 * 1. Vosk (nhận diện offline "Hey LiBot" ở màn hình Idle)
 * 2. Xiaozhi (hội thoại trực tiếp với Google Speech / Google TTS)
 *
 * Đảm bảo tính loại trừ lẫn nhau (Mutual Exclusion):
 * Tại một thời điểm, chỉ một engine duy nhất được phép chiếm dụng Microphone.
 */
export function useKioskVoiceCoordinator({
  isConnected,
  onRecordInteraction,
  settleDelayMs = DEFAULT_VOICE_SETTLE_DELAY_MS,
}: UseKioskVoiceCoordinatorOptions): UseKioskVoiceCoordinatorReturn {
  const [state, setState] = useState<KioskVoiceCoordinatorState>(
    INITIAL_KIOSK_VOICE_STATE,
  );

  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearSettleTimer();
    };
  }, [clearSettleTimer]);

  // Khi phát hiện từ khóa "Hey LiBot"
  const handleWakeWordDetected = useCallback(() => {
    clearSettleTimer();
    onRecordInteraction();
    setState(kioskVoiceStateTransitions.wakeWordDetected());
  }, [clearSettleTimer, onRecordInteraction]);

  // Khi người dùng bấm nút FAB Micro trên màn hình
  const openManualVoice = useCallback(() => {
    clearSettleTimer();
    onRecordInteraction();
    setState(kioskVoiceStateTransitions.manualTriggered());
  }, [clearSettleTimer, onRecordInteraction]);

  // Khi modal đóng (người dùng bấm X / backdrop hoặc timeout 60s)
  const closeVoice = useCallback(() => {
    clearSettleTimer();
    onRecordInteraction();

    // 1. Đóng modal ngay lập tức và giữ cờ Vosk khóa để bước vào settling buffer
    setState((curr) =>
      kioskVoiceStateTransitions.voiceClosedStartSettling(curr),
    );

    // 2. Chờ độ trễ đệm settleDelayMs để Android hoàn tất việc giải phóng mic
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      setState((curr) => kioskVoiceStateTransitions.settlingCompleted(curr));
    }, settleDelayMs);
  }, [clearSettleTimer, onRecordInteraction, settleDelayMs]);

  // Wake Word chỉ được phép lắng nghe khi isWakeWordPermitted === true
  const wakeWord = useWakeWord({
    enabled: state.isWakeWordPermitted,
    onWakeWord: handleWakeWordDetected,
  });

  // Tính toán nhãn trạng thái thân thiện hiển thị trên thanh TopBar
  const statusLabel = computeKioskVoiceStatusLabel({
    isVoiceModalOpen: state.isVoiceModalOpen,
    isWakeWordPermitted: state.isWakeWordPermitted,
    wakeWordPhase: wakeWord.phase,
    isConnected,
  });

  return {
    isVoiceModalOpen: state.isVoiceModalOpen,
    voiceActivation: state.voiceActivation,
    wakeWordPhase: wakeWord.phase,
    statusLabel,
    openManualVoice,
    closeVoice,
    handleWakeWordDetected,
  };
}
