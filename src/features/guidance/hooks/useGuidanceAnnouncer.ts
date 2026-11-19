import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";
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
  const [state, setState] = useState<GuidanceAnnouncerState>(() =>
    activeJobId
      ? guidanceAnnouncerTransitions.sessionStarted(activeJobId).state
      : INITIAL_GUIDANCE_ANNOUNCER_STATE,
  );
  const [prevJobId, setPrevJobId] = useState<string | null>(activeJobId ?? null);
  const announcedStartJobIdRef = useRef<string | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize state during render when activeJobId prop changes (React 19 pattern)
  if (activeJobId !== prevJobId) {
    setPrevJobId(activeJobId ?? null);
    if (!activeJobId) {
      setState(guidanceAnnouncerTransitions.reset());
    } else {
      setState((current) => guidanceAnnouncerTransitions.sessionStarted(activeJobId, current).state);
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
      Speech.stop();
      Speech.speak(text, {
        language: "vi-VN",
        pitch: 1.0,
        rate: 0.95,
      });
    } catch {
      // Graceful fallback if device has no TTS engine
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    clearTimer();
    try {
      Speech.stop();
    } catch {
      // Graceful fallback
    }
  }, [clearTimer]);

  // Execute Start side-effect (speech) once per mission
  useEffect(() => {
    if (!enabled || !activeJobId) {
      if (!activeJobId) {
        announcedStartJobIdRef.current = null;
      }
      return;
    }

    if (announcedStartJobIdRef.current !== activeJobId) {
      announcedStartJobIdRef.current = activeJobId;
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
  }, [activeJobId, enabled, speak, transitionDelayMs]);

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
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    phase: state.phase,
    announcedJobId: state.announcedJobId,
    announceArrival,
    announceError,
    stopSpeaking,
    reset,
  };
}
