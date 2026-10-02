import { useEffect } from "react";
import { runtimeConfig } from "../config/runtimeConfig";
import { useKioskStore } from "../state/kioskStore";

export function shouldResetOnIdle(
  activeMissionId: string | null,
  elapsedMs: number,
  timeoutMs: number,
  isVoiceActive: boolean = false,
): boolean {
  if (isVoiceActive) {
    return false;
  }
  if (activeMissionId !== null && activeMissionId !== "") {
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
    timeoutSeconds = runtimeConfig.idleTimeoutSeconds,
    onTimeout,
    enabled = true,
  } = options;

  const timeoutMs = timeoutSeconds * 1000;
  const activeMissionId = useKioskStore((state) => state.activeMissionId);
  const isVoiceActive = useKioskStore((state) => state.isVoiceActive);
  const lastInteractionAt = useKioskStore((state) => state.lastInteractionAt);
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastInteractionAt;
      if (
        shouldResetOnIdle(activeMissionId, elapsed, timeoutMs, isVoiceActive)
      ) {
        resetKioskSession();
        onTimeout?.();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [
    enabled,
    activeMissionId,
    isVoiceActive,
    lastInteractionAt,
    timeoutMs,
    resetKioskSession,
    onTimeout,
  ]);
}
