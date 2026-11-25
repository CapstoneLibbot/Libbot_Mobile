import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { speakAnnouncement, stopSpeaking as stopNativeSpeaking } from "xiaozhi-audio";
import {
  type GuidancePhase,
  GUIDANCE_SPEECH_TEXTS,
  GUIDANCE_TRANSITION_DELAY_MS,
  type GuidanceAnnouncerState,
  INITIAL_GUIDANCE_ANNOUNCER_STATE,
  guidanceAnnouncerTransitions,
} from "../domain/guidanceAnnouncerState";

export {
  type GuidancePhase,
  GUIDANCE_SPEECH_TEXTS,
  GUIDANCE_TRANSITION_DELAY_MS,
  type GuidanceAnnouncerState,
  INITIAL_GUIDANCE_ANNOUNCER_STATE,
  guidanceAnnouncerTransitions,
};

export interface UseGuidanceAnnouncerOptions {
  activeJobId?: string | null;
  enabled?: boolean;
  transitionDelayMs?: number;
}

export function useGuidanceAnnouncer({
  activeJobId,
  enabled = true,
  transitionDelayMs = GUIDANCE_TRANSITION_DELAY_MS,
}: UseGuidanceAnnouncerOptions = {}) {
  const normalizedJobId = activeJobId ?? null;
  const [state, setState] = useState<GuidanceAnnouncerState>(() =>
    normalizedJobId
      ? guidanceAnnouncerTransitions.sessionStarted(normalizedJobId).state
      : INITIAL_GUIDANCE_ANNOUNCER_STATE,
  );
  const [prevJobId, setPrevJobId] = useState<string | null>(normalizedJobId);
  const announcedStartJobIdRef = useRef<string | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize state during render when activeJobId prop changes (React 19 pattern)
  if (normalizedJobId !== prevJobId) {
    setPrevJobId(normalizedJobId);
    if (!normalizedJobId) {
      setState(guidanceAnnouncerTransitions.reset());
    } else {
      setState((current) => guidanceAnnouncerTransitions.sessionStarted(normalizedJobId, current).state);
    }
  }

  const clearTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const speak = useCallback((text: string) => {
    try {
      void stopNativeSpeaking();
      void speakAnnouncement(text);
    } catch {
      // Graceful fallback
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    clearTimer();
    try {
      void stopNativeSpeaking();
    } catch {
      // Graceful fallback
    }
  }, [clearTimer]);

  // Execute Start side-effect (speech) once per job
  useEffect(() => {
    if (!enabled || !normalizedJobId) {
      if (!normalizedJobId) {
        announcedStartJobIdRef.current = null;
      }
      return;
    }

    if (announcedStartJobIdRef.current !== normalizedJobId) {
      announcedStartJobIdRef.current = normalizedJobId;
      speak(GUIDANCE_SPEECH_TEXTS.START);

      transitionTimerRef.current = setTimeout(() => {
        setState((curr) => guidanceAnnouncerTransitions.departingCompleted(curr));
        transitionTimerRef.current = null;
      }, transitionDelayMs);

      return () => {
        if (transitionTimerRef.current) {
          clearTimeout(transitionTimerRef.current);
          transitionTimerRef.current = null;
        }
      };
    }
  }, [normalizedJobId, enabled, speak, transitionDelayMs]);

  const announceArrival = useCallback(
    (onComplete?: () => void) => {
      clearTimer();
      setState((current) => {
        const transition = guidanceAnnouncerTransitions.arrived(current);
        speak(transition.speechText);
        return transition.state;
      });
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null;
        onComplete?.();
      }, transitionDelayMs);
    },
    [clearTimer, speak, transitionDelayMs],
  );

  const announceError = useCallback(
    (onError?: () => void) => {
      clearTimer();
      setState((current) => {
        const transition = guidanceAnnouncerTransitions.failed(current);
        speak(transition.speechText);
        return transition.state;
      });
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null;
        onError?.();
      }, transitionDelayMs);
    },
    [clearTimer, speak, transitionDelayMs],
  );

  const reset = useCallback(() => {
    stopSpeaking();
    setState(guidanceAnnouncerTransitions.reset());
    announcedStartJobIdRef.current = null;
  }, [stopSpeaking]);

  useEffect(() => {
    return () => {
      // Clear any pending timers. Do not stop audio abruptly on unmount so
      // announcements like "Đã đến nơi rồi" finish speaking cleanly.
      clearTimer();
    };
  }, [clearTimer]);

  return useMemo(
    () => ({
      phase: state.phase,
      announcedJobId: state.announcedJobId,
      announceArrival,
      announceError,
      stopSpeaking,
      reset,
    }),
    [state.phase, state.announcedJobId, announceArrival, announceError, stopSpeaking, reset],
  );
}
