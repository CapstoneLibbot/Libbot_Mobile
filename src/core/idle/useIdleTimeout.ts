import { useEffect } from "react";
import { kioskTimeoutConfig } from "../config/kioskTimeoutConfig";
import { useKioskStore } from "../state/kioskStore";

export function shouldResetOnIdle(
  activeJobId: string | null,
  elapsedMs: number,
  timeoutMs: number,
  isVoiceActive: boolean = false,
): boolean {
  if (isVoiceActive) {
    return false;
  }
  if (activeJobId !== null && activeJobId !== "") {
    return false;
  }
  return elapsedMs >= timeoutMs;
}

export interface UseIdleTimeoutOptions {
  timeoutSeconds?: number;
  onTimeout?: () => void;
  enabled?: boolean;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions = {}): void {
  const {
    timeoutSeconds,
    onTimeout,
    enabled = true,
  } = options;

  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const state = useKioskStore.getState();
      const currentTimeoutSeconds =
        timeoutSeconds ?? kioskTimeoutConfig.kioskIdleSeconds;
      const timeoutMs = currentTimeoutSeconds * 1000;
      const elapsed = Date.now() - state.lastInteractionAt;

      if (
        shouldResetOnIdle(
          state.activeJobId,
          elapsed,
          timeoutMs,
          state.isVoiceActive,
        )
      ) {
        if (__DEV__) {
          console.log(
            `[useIdleTimeout] Inactivity detected: ${Math.round(elapsed / 1000)}s >= ${currentTimeoutSeconds}s (voiceActive=${state.isVoiceActive}, activeJob=${state.activeJobId || "none"}). Resetting kiosk session.`,
          );
        }
        resetKioskSession();
        onTimeout?.();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [enabled, timeoutSeconds, resetKioskSession, onTimeout]);
}

