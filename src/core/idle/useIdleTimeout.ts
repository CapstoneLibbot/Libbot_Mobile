import { useEffect } from "react";
import { runtimeConfig } from "../config/runtimeConfig";
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
    timeoutSeconds = runtimeConfig.idleTimeoutSeconds,
    onTimeout,
    enabled = true,
  } = options;

  const timeoutMs = timeoutSeconds * 1000;
  const activeJobId = useKioskStore((state) => state.activeJobId);
  const isVoiceActive = useKioskStore((state) => state.isVoiceActive);
  const lastInteractionAt = useKioskStore((state) => state.lastInteractionAt);
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastInteractionAt;
      if (
        shouldResetOnIdle(activeJobId, elapsed, timeoutMs, isVoiceActive)
      ) {
        resetKioskSession();
        onTimeout?.();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [
    enabled,
    activeJobId,
    isVoiceActive,
    lastInteractionAt,
    timeoutMs,
    resetKioskSession,
    onTimeout,
  ]);
}
