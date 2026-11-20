import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { NativeWakeWord } from "libot-wakeword";
import { type WakeWordPhase } from "../../domain/wakeWordState";
import { WAKE_WORD_CONFIG } from "../constants/wakeWordConfig";
import {
  type UseWakeWordOptions,
  type UseWakeWordReturn,
} from "../domain/wakeWordTypes";

const STOP_SETTLE_MS = 200;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function ensureMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (alreadyGranted) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Quyền Microphone",
        message:
          "Robot cần quyền micro để nhận diện giọng nói khi bạn gọi 'Hey Bot'.",
        buttonPositive: "Cho phép",
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Hook quản lý nhận diện Wake Word on-device bằng mô hình openWakeWord Native (Android AudioRecord + ONNX).
 *
 * Tính năng chính:
 * 1. Thu âm 16kHz trực tiếp từ mic phần cứng qua module Native `libot-wakeword`.
 * 2. Tự động kiểm tra và yêu cầu quyền RECORD_AUDIO trên Android.
 * 3. Chạy suy luận ONNX thời gian thực (melspectrogram -> embedding -> hey_bot).
 * 4. Tương thích tuyệt đối với hàng đợi Promise queue (enqueueTransition) chống race-condition nhả/chiếm mic.
 * 5. Tự động fallback an toàn trong môi trường Web / Unit test.
 */
export function useWakeWord({
  enabled,
  onWakeWord,
  threshold = WAKE_WORD_CONFIG.threshold,
}: UseWakeWordOptions): UseWakeWordReturn {
  const [isLoaded, setIsLoaded] = useState(!NativeWakeWord.isAvailable());
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [phase, setPhase] = useState<WakeWordPhase>(
    enabled ? "listening" : "paused_for_voice",
  );

  const isListeningRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWord);
  const enabledRef = useRef(enabled);
  const transitionRef = useRef(Promise.resolve());

  useEffect(() => {
    onWakeWordRef.current = onWakeWord;
  }, [onWakeWord]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const enqueueTransition = useCallback((work: () => Promise<void>) => {
    transitionRef.current = transitionRef.current.then(work, work);
    return transitionRef.current;
  }, []);

  const stopAndSettle = useCallback(async (nextPhase: WakeWordPhase) => {
    const wasListening = isListeningRef.current;
    isListeningRef.current = false;
    setScore(0);
    setPhase("stopping");

    if (NativeWakeWord.isAvailable()) {
      try {
        await NativeWakeWord.stopListening();
      } catch {
        // Module might already be stopped
      }
    }

    if (wasListening) {
      await wait(STOP_SETTLE_MS);
    }
    setPhase(nextPhase);
  }, []);

  // 1. Khởi tạo mô hình ONNX khi component mount
  useEffect(() => {
    if (!NativeWakeWord.isAvailable()) {
      return;
    }
    let disposed = false;

    void (async () => {
      try {
        setPhase("loading_model");
        const loaded = await NativeWakeWord.initModels("wakeword/hey_bot.onnx");
        if (!disposed && loaded) {
          setIsLoaded(true);
          setError(null);
          setPhase(enabledRef.current ? "starting_listener" : "paused_for_voice");
        }
      } catch (err) {
        if (!disposed) {
          setError(
            err instanceof Error ? err.message : "Không thể nạp mô hình ONNX.",
          );
          setPhase("error");
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, []);

  // 2. Quản lý lắng nghe và đăng ký sự kiện Native
  useEffect(() => {
    if (!enabled || !isLoaded) {
      void enqueueTransition(() => stopAndSettle("paused_for_voice"));
      return;
    }

    let active = true;

    // Đăng ký nhận sự kiện phát hiện từ khóa từ tầng Native
    const subWake = NativeWakeWord.addWakeWordListener((event) => {
      if (!active || !isListeningRef.current) return;
      console.info(
        `[WakeWord Native] Detected ${event.keyword} with score=${event.score.toFixed(3)}`,
      );
      setScore(event.score);
      active = false;
      void enqueueTransition(async () => {
        await stopAndSettle("paused_for_voice");
        onWakeWordRef.current(event.keyword);
      });
    });

    const subError = NativeWakeWord.addErrorListener((event) => {
      if (!active) return;
      setError(event.message);
      setPhase("error");
    });

    const subState = NativeWakeWord.addStateListener((event) => {
      if (!active) return;
      isListeningRef.current = event.isListening;
      if (event.isListening) {
        setPhase("listening");
      }
    });

    void enqueueTransition(async () => {
      if (!active || !enabledRef.current) return;
      try {
        setPhase("starting_listener");

        const hasMicPermission = await ensureMicrophonePermission();
        if (!hasMicPermission) {
          isListeningRef.current = false;
          setError("Chưa cấp quyền microphone để nhận diện từ khóa.");
          setPhase("error");
          return;
        }

        if (NativeWakeWord.isAvailable()) {
          await NativeWakeWord.startListening({
            keyword: WAKE_WORD_CONFIG.keyword,
            threshold,
            classifierAsset: "wakeword/hey_bot.onnx",
          });
        }
        isListeningRef.current = true;
        setPhase("listening");
        setError(null);
      } catch (err) {
        isListeningRef.current = false;
        setError(
          err instanceof Error
            ? err.message
            : "Lỗi khởi động openWakeWord engine.",
        );
        setPhase("error");
      }
    });

    return () => {
      active = false;
      subWake?.remove();
      subError?.remove();
      subState?.remove();
      void enqueueTransition(() => stopAndSettle("paused_for_voice"));
    };
  }, [enabled, enqueueTransition, isLoaded, stopAndSettle, threshold]);

  return {
    isLoaded,
    error,
    phase,
    score,
  };
}
