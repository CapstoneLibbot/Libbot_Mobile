import { describe, expect, it, vi } from "vitest";
import {
  computeKioskVoiceStatusLabel,
  DEFAULT_VOICE_SETTLE_DELAY_MS,
  INITIAL_KIOSK_VOICE_STATE,
  kioskVoiceStateTransitions,
  type KioskVoiceCoordinatorState,
} from "../domain/kioskVoiceCoordinatorState";
import { WAKE_WORD_STATUS_LABEL } from "../domain/wakeWordState";

describe("Kiosk Voice Coordinator State Transitions & Architecture", () => {
  describe("State Transitions Contract", () => {
    it("starts in idle state with wake word permitted and modal closed", () => {
      expect(INITIAL_KIOSK_VOICE_STATE).toEqual({
        isVoiceModalOpen: false,
        voiceActivation: "manual",
        isWakeWordPermitted: true,
      });
    });

    it("transitions to wake session on wakeWordDetected, disabling Vosk immediately", () => {
      const next = kioskVoiceStateTransitions.wakeWordDetected();
      expect(next).toEqual({
        isVoiceModalOpen: true,
        voiceActivation: "wake",
        isWakeWordPermitted: false,
      });
    });

    it("transitions to manual session on manualTriggered, disabling Vosk immediately", () => {
      const next = kioskVoiceStateTransitions.manualTriggered();
      expect(next).toEqual({
        isVoiceModalOpen: true,
        voiceActivation: "manual",
        isWakeWordPermitted: false,
      });
    });

    it("keeps wake word disabled during settling phase when session ends", () => {
      const activeState: KioskVoiceCoordinatorState = {
        isVoiceModalOpen: true,
        voiceActivation: "wake",
        isWakeWordPermitted: false,
      };

      const settlingState =
        kioskVoiceStateTransitions.voiceClosedStartSettling(activeState);
      expect(settlingState.isVoiceModalOpen).toBe(false);
      expect(settlingState.isWakeWordPermitted).toBe(false);

      const restoredState =
        kioskVoiceStateTransitions.settlingCompleted(settlingState);
      expect(restoredState.isVoiceModalOpen).toBe(false);
      expect(restoredState.isWakeWordPermitted).toBe(true);
    });
  });

  describe("Status Label Policy (computeKioskVoiceStatusLabel)", () => {
    it("returns 'paused_for_voice' when voice modal is active", () => {
      const label = computeKioskVoiceStatusLabel({
        isVoiceModalOpen: true,
        isWakeWordPermitted: false,
        wakeWordPhase: "listening",
        isConnected: true,
      });
      expect(label).toBe(WAKE_WORD_STATUS_LABEL.paused_for_voice);
    });

    it("returns settling message when modal is closed but Vosk is not yet permitted", () => {
      const label = computeKioskVoiceStatusLabel({
        isVoiceModalOpen: false,
        isWakeWordPermitted: false,
        wakeWordPhase: "idle" as any,
        isConnected: true,
      });
      expect(label).toBe(WAKE_WORD_STATUS_LABEL.loading_model);
    });

    it("returns offline notice when Vosk encounters error and network is disconnected", () => {
      const label = computeKioskVoiceStatusLabel({
        isVoiceModalOpen: false,
        isWakeWordPermitted: true,
        wakeWordPhase: "error",
        isConnected: false,
      });
      expect(label).toBe("Đang chạy chế độ dữ liệu nội bộ");
    });

    it("returns phase label when listening normally", () => {
      const label = computeKioskVoiceStatusLabel({
        isVoiceModalOpen: false,
        isWakeWordPermitted: true,
        wakeWordPhase: "listening",
        isConnected: true,
      });
      expect(label).toBe(WAKE_WORD_STATUS_LABEL.listening);
    });
  });

  describe("Mutual Exclusion & Settle Buffer Simulation", () => {
    it("enforces default 400ms settle delay between modal close and Vosk start", () => {
      vi.useFakeTimers();

      let state = { ...INITIAL_KIOSK_VOICE_STATE };
      let settleTimer: any = null;

      const openVoice = (type: "manual" | "wake") => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        state =
          type === "wake"
            ? kioskVoiceStateTransitions.wakeWordDetected()
            : kioskVoiceStateTransitions.manualTriggered();
      };

      const closeVoice = (settleMs = DEFAULT_VOICE_SETTLE_DELAY_MS) => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        state = kioskVoiceStateTransitions.voiceClosedStartSettling(state);
        settleTimer = setTimeout(() => {
          settleTimer = null;
          state = kioskVoiceStateTransitions.settlingCompleted(state);
        }, settleMs);
      };

      // 1. Initial
      expect(state.isWakeWordPermitted).toBe(true);

      // 2. Wake word fires
      openVoice("wake");
      expect(state.isVoiceModalOpen).toBe(true);
      expect(state.isWakeWordPermitted).toBe(false);

      // 3. User finishes talking and modal closes
      closeVoice();
      expect(state.isVoiceModalOpen).toBe(false);
      expect(state.isWakeWordPermitted).toBe(false); // Vosk is still safely muted!

      // 4. Advance 399ms (HAL and Google SpeechRecognizer are releasing mic)
      vi.advanceTimersByTime(399);
      expect(state.isWakeWordPermitted).toBe(false);

      // 5. Complete 400ms: settle completes, Vosk is safely re-armed
      vi.advanceTimersByTime(1);
      expect(state.isWakeWordPermitted).toBe(true);

      vi.useRealTimers();
    });
  });
});
