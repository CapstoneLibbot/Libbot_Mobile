import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Vosk from "react-native-vosk";
import {
  DEFAULT_VOSK_MODEL_NAME,
  DEFAULT_VOSK_WAKE_GRAMMAR,
  createWakeWordDetector,
} from "../constants/voskWakeWordConfig";
import { type WakeWordPhase } from "../domain/wakeWordState";

export {
  DEFAULT_VOSK_MODEL_NAME,
  DEFAULT_VOSK_WAKE_GRAMMAR,
  createWakeWordDetector,
  isWakeWordMatch,
} from "../constants/voskWakeWordConfig";

export interface UseVoskWakeWordOptions {
  enabled: boolean;
  onWakeWord: (keyword: string) => void;
  grammar?: readonly string[] | string[];
  modelName?: string;
}

export interface UseVoskWakeWordReturn {
  isLoaded: boolean;
  error: string | null;
  phase: WakeWordPhase;
}

const STOP_SETTLE_MS = 250;
const MAX_RETRY_DELAY_MS = 1_000;
let loadedModelName: string | null = null;
let loadingModel: Promise<void> | null = null;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Lỗi Vosk không xác định.";
  }
}

/**
 * Hook quản lý nhận diện Wake Word on-device (offline) bằng Vosk.
 * - Chỉ lắng nghe khi `enabled === true` và mô hình đã nạp xong (`isLoaded === true`).
 * - Khi phát hiện từ khóa, tự động `stop()` mic và gọi callback `onWakeWord(keyword)`.
 */
export function useVoskWakeWord({
  enabled,
  onWakeWord,
  grammar = DEFAULT_VOSK_WAKE_GRAMMAR,
  modelName = DEFAULT_VOSK_MODEL_NAME,
}: UseVoskWakeWordOptions): UseVoskWakeWordReturn {
  const initialLoaded = loadedModelName === modelName;
  const [isLoaded, setIsLoaded] = useState(initialLoaded);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<WakeWordPhase>(
    initialLoaded
      ? enabled
        ? "starting_listener"
        : "paused_for_voice"
      : "loading_model",
  );

  const isLoadedRef = useRef(initialLoaded);
  const isListeningRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWord);
  const enabledRef = useRef(enabled);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionRef = useRef(Promise.resolve());
  const wakeWordDetectorRef = useRef(createWakeWordDetector());
  const grammarKey = useMemo(() => grammar.join("\u0000"), [grammar]);
  const grammarSnapshot = useMemo(
    () => (grammarKey ? grammarKey.split("\u0000") : []),
    [grammarKey],
  );

  useEffect(() => {
    onWakeWordRef.current = onWakeWord;
  }, [onWakeWord]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const clearTimers = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  const enqueueTransition = useCallback((work: () => Promise<void>) => {
    transitionRef.current = transitionRef.current.then(work, work);
    return transitionRef.current;
  }, []);

  const stopAndSettle = useCallback(async (nextPhase: WakeWordPhase) => {
    wakeWordDetectorRef.current.reset();
    const wasListening = isListeningRef.current;
    isListeningRef.current = false;
    setPhase("stopping");
    try {
      Vosk.stop();
    } catch {
      // The module can already be stopped after an audio interruption.
    }
    if (wasListening) {
      await wait(STOP_SETTLE_MS);
    }
    setPhase(nextPhase);
  }, []);

  // 1. Nạp mô hình một lần duy nhất khi component mount
  useEffect(() => {
    let disposed = false;

    void (async () => {
      try {
        if (loadedModelName !== modelName) {
          loadingModel ??= Vosk.loadModel(modelName).then(() => {
            loadedModelName = modelName;
          });
          await loadingModel;
        }
        if (!disposed) {
          isLoadedRef.current = true;
          setIsLoaded(true);
          setError(null);
        }
      } catch (err) {
        loadingModel = null;
        if (!disposed) {
          setError(
            err instanceof Error ? err.message : "Không thể nạp mô hình Vosk.",
          );
          setPhase("error");
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [modelName]);

  // Listener lifecycle được tuần tự hóa qua Promise queue (enqueueTransition)
  // để loại bỏ race condition khi nhận diện/nhả mic.
  useEffect(() => {
    clearTimers();
    if (!enabled || !isLoaded) {
      void enqueueTransition(() => stopAndSettle("paused_for_voice"));
      return;
    }

    let active = true;
    const scheduleRetry = (reason: "timeout" | "error" | "start") => {
      if (!active || !enabledRef.current) return;
      if (retryTimerRef.current) return;
      // On normal silence timeout, restart listening promptly without compounding exponential delay
      let delay = 200;
      if (reason !== "timeout") {
        const attempt = retryAttemptRef.current++;
        delay = Math.min(250 * 2 ** attempt, MAX_RETRY_DELAY_MS);
      }
      setPhase("retry_wait");
      console.info(`[VoskWake] retry reason=${reason} delay=${delay}`);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void startListening();
      }, delay);
    };

    const startListening = () => {
      void enqueueTransition(async () => {
        if (!active || !enabledRef.current || !isLoadedRef.current) return;
        if (isListeningRef.current) return;
        try {
          setPhase("starting_listener");
          // Defensive cleanup: ensure any lingering native recognizer is stopped before starting
          try {
            Vosk.stop();
          } catch {
            // Ignore if already stopped
          }
          // Đặt timeout 8 giây để định kỳ làm mới lattice nhận diện Kaldi,
          // giải phóng bộ nhớ âm học và tránh bị co hẹp beam width sau nhiều lần nói.
          await Vosk.start({ grammar: grammarSnapshot, timeout: 8000 });
          if (!active || !enabledRef.current) {
            try {
              Vosk.stop();
            } catch {}
            setPhase("paused_for_voice");
            return;
          }
          retryAttemptRef.current = 0;
          isListeningRef.current = true;
          setError(null);
          setPhase("listening");
          console.info("[VoskWake] listening");
        } catch (err) {
          if (!active || !enabledRef.current) return;
          isListeningRef.current = false;
          // Ensure native recognizer is cleanly torn down on failure
          try {
            Vosk.stop();
          } catch {}
          const message = describeError(err);
          setError(message);
          console.warn(`[VoskWake] start_failed message=${message}`);
          scheduleRetry("start");
        }
      });
    };

    const handleResult = (text: string) => {
      if (!active || !isListeningRef.current) return;
      if (wakeWordDetectorRef.current.consume(text)) {
        active = false;
        clearTimers();
        void enqueueTransition(async () => {
          await stopAndSettle("paused_for_voice");
          console.info(`[VoskWake] detected text=${text}`);
          onWakeWordRef.current(text);
        });
      } else if (__DEV__ && text.trim()) {
        // Only log non-empty decoder hypotheses in development. This makes it
        // possible to tune transcript aliases on a physical device without
        // exposing microphone transcripts in production logs.
        console.debug(`[VoskWake] ignored text=${text}`);
      }
    };

    const subResult = Vosk.onResult(handleResult);
    const subPartial = Vosk.onPartialResult(handleResult);
    const subFinal = Vosk.onFinalResult(handleResult);
    const subError = Vosk.onError((err) => {
      if (!active || !enabledRef.current || !isListeningRef.current) return;
      isListeningRef.current = false;
      setError(typeof err === "string" ? err : "Vosk gặp lỗi nhận diện.");
      try {
        Vosk.stop();
      } catch {
        // The service may have stopped itself before emitting the error.
      }
      scheduleRetry("error");
    });
    const subTimeout = Vosk.onTimeout(() => {
      if (!active || !enabledRef.current || !isListeningRef.current) return;
      isListeningRef.current = false;
      try {
        Vosk.stop();
      } catch {
        // The service may have stopped itself before emitting the timeout.
      }
      scheduleRetry("timeout");
    });

    startListening();

    return () => {
      active = false;
      clearTimers();
      subResult.remove();
      subPartial.remove();
      subFinal.remove();
      subError.remove();
      subTimeout.remove();
      void enqueueTransition(() => stopAndSettle("paused_for_voice"));
    };
  }, [clearTimers, enabled, enqueueTransition, grammarSnapshot, isLoaded, stopAndSettle]);

  return {
    isLoaded,
    error,
    phase,
  };
}
