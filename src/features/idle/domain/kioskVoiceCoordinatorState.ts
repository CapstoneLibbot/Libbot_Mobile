import {
  type WakeWordPhase,
  WAKE_WORD_STATUS_LABEL,
} from "./wakeWordState";

/**
 * Khoảng thời gian đệm an toàn sau khi modal hội thoại đóng.
 * Giúp Android Audio HAL / AudioPolicy có đủ thời gian nhả phần cứng mic
 * và hủy SpeechRecognizer trước khi Vosk khởi động lại.
 */
export const DEFAULT_VOICE_SETTLE_DELAY_MS = 400;

export interface KioskVoiceCoordinatorState {
  isVoiceModalOpen: boolean;
  voiceActivation: "manual" | "wake";
  isWakeWordPermitted: boolean;
}

export const INITIAL_KIOSK_VOICE_STATE: KioskVoiceCoordinatorState = {
  isVoiceModalOpen: false,
  voiceActivation: "manual",
  isWakeWordPermitted: true,
};

export const kioskVoiceStateTransitions = {
  wakeWordDetected: (): KioskVoiceCoordinatorState => ({
    isVoiceModalOpen: true,
    voiceActivation: "wake",
    isWakeWordPermitted: false,
  }),
  manualTriggered: (): KioskVoiceCoordinatorState => ({
    isVoiceModalOpen: true,
    voiceActivation: "manual",
    isWakeWordPermitted: false,
  }),
  voiceClosedStartSettling: (
    current: KioskVoiceCoordinatorState,
  ): KioskVoiceCoordinatorState => ({
    ...current,
    isVoiceModalOpen: false,
    isWakeWordPermitted: false,
  }),
  settlingCompleted: (
    current: KioskVoiceCoordinatorState,
  ): KioskVoiceCoordinatorState => ({
    ...current,
    isWakeWordPermitted: true,
  }),
};

export function computeKioskVoiceStatusLabel(params: {
  isVoiceModalOpen: boolean;
  isWakeWordPermitted: boolean;
  wakeWordPhase: WakeWordPhase;
  isConnected: boolean;
}): string {
  const { isVoiceModalOpen, isWakeWordPermitted, wakeWordPhase, isConnected } =
    params;
  if (isVoiceModalOpen) {
    return WAKE_WORD_STATUS_LABEL.paused_for_voice;
  }
  if (!isWakeWordPermitted) {
    return WAKE_WORD_STATUS_LABEL.loading_model;
  }
  if (wakeWordPhase === "error" && !isConnected) {
    return "Đang chạy chế độ dữ liệu nội bộ";
  }
  return WAKE_WORD_STATUS_LABEL[wakeWordPhase] ?? "LiBot sẵn sàng";
}
