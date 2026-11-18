import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { env } from "@/config";
import XiaozhiAudio, {
  addXiaozhiEventListener,
  type XiaozhiNativeEvent,
} from "xiaozhi-audio";
import {
  toVoiceToolResult,
  type VoiceToolResult,
} from "../utils/voiceToolResult";
import { type VoiceSessionPhase } from "../domain/voiceSessionState";
import type { GuidanceKind, GuidanceStartStatus } from "@/features/guidance/types/guidance.types";

export { type VoiceToolResult } from "../utils/voiceToolResult";

export type XiaozhiVoiceStatus = VoiceSessionPhase;

export interface VoiceConversationEntry {
  id: string;
  speaker: "user" | "assistant";
  text: string;
  isPending?: boolean;
  toolResult?: VoiceToolResult;
}

export interface VoiceGuidanceStart {
  jobId: string;
  executionId: string;
  guidanceKind: GuidanceKind;
  startStatus: GuidanceStartStatus;
  destinationId: string;
  destinationName: string;
  runtimeId: string;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RESPONSE_TIMEOUT_MS = 30_000;
const OPENING_GREETING =
  "Xin chào, tôi là LiBot. Tôi có thể giúp bạn tìm sách hoặc khu vực trong thư viện.";
let conversationSequence = 0;

function createConversationId(): string {
  conversationSequence += 1;
  return `voice-${conversationSequence}`;
}

async function requestMicrophonePermission(): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("Xiaozhi voice hiện chỉ hỗ trợ Android kiosk.");
  }
  const permission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Bạn cần cấp quyền microphone để nói chuyện với LiBot.");
  }
}

/** Native Xiaozhi audio transport. It only receives public LAN connection data. */
export function useXiaozhiVoiceSession() {
  const [status, setStatus] = useState<XiaozhiVoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState<string | null>(null);
  const [voiceActivitySequence, setVoiceActivitySequence] = useState(0);
  const [conversation, setConversation] = useState<VoiceConversationEntry[]>(
    [],
  );
  const [guidanceStart, setGuidanceStart] = useState<VoiceGuidanceStart | null>(null);
  const wantsSessionRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasGreetedRef = useRef(false);
  const greetingInProgressRef = useRef(false);
  const greetingRef = useRef(OPENING_GREETING);
  const pendingAssistantIdRef = useRef<string | null>(null);
  const nativeSessionEndedRef = useRef(true);
  const endingPromiseRef = useRef<Promise<void> | null>(null);

  const recordVoiceActivity = useCallback(() => {
    setVoiceActivitySequence((previous) => previous + 1);
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const clearResponseTimer = useCallback(() => {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    responseTimerRef.current = null;
  }, []);

  const armResponseTimeout = useCallback(() => {
    clearResponseTimer();
    responseTimerRef.current = setTimeout(() => {
      if (!wantsSessionRef.current) return;
      setError("LiBot chưa phản hồi. Bạn có thể nói lại câu hỏi.");
      setStatus("listening");
      void XiaozhiAudio?.resumeCapture();
    }, RESPONSE_TIMEOUT_MS);
  }, [clearResponseTimer]);

  const connect = useCallback(async () => {
    if (!env.xiaozhiWsUrl || !env.voiceKioskId) {
      throw new Error(
        "Chưa cấu hình EXPO_PUBLIC_XIAOZHI_WS_URL và EXPO_PUBLIC_VOICE_KIOSK_ID.",
      );
    }
    if (!XiaozhiAudio) {
      throw new Error(
        "Bản APK này chưa có native Xiaozhi audio module. Hãy dùng development/EAS build, không dùng Expo Go.",
      );
    }
    setStatus("connecting");
    await XiaozhiAudio.connect(env.xiaozhiWsUrl, env.voiceKioskId);
  }, []);

  const reconnect = useCallback(async () => {
    while (
      wantsSessionRef.current &&
      reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS
    ) {
      const attempt = reconnectAttemptRef.current++;
      await new Promise<void>((resolve) => {
        reconnectTimerRef.current = setTimeout(
          resolve,
          Math.min(1_000 * 2 ** attempt, 4_000),
        );
      });
      if (!wantsSessionRef.current) return;
      try {
        await connect();
        return;
      } catch {
        // Try the bounded next backoff interval.
      }
    }
    if (wantsSessionRef.current) {
      setStatus("error");
      setError("Mất kết nối Xiaozhi. Vui lòng đóng và thử lại.");
    }
  }, [connect]);

  const handleEvent = useCallback(
    (event: XiaozhiNativeEvent) => {
      switch (event.type) {
        case "speech_started":
          // This is emitted by Android as soon as it detects human speech,
          // before a partial/final transcript is available.
          recordVoiceActivity();
          setStatus("listening");
          return;
        case "connected":
          reconnectAttemptRef.current = 0;
          setError(null);
          if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            greetingInProgressRef.current = true;
            const greeting = greetingRef.current;
            setAssistantText(greeting);
            setConversation([
              {
                id: createConversationId(),
                speaker: "assistant",
                text: greeting,
              },
            ]);
            setStatus("speaking");
            void XiaozhiAudio?.speakGreeting(greeting);
          } else {
            void XiaozhiAudio?.resumeCapture();
          }
          return;
        case "listening":
          if (greetingInProgressRef.current) {
            greetingInProgressRef.current = false;
          }
          clearResponseTimer();
          setStatus("listening");
          return;
        case "stt":
          if (event.text?.trim()) {
            recordVoiceActivity();
            const userText = event.text.trim();
            const assistantId = createConversationId();
            pendingAssistantIdRef.current = assistantId;
            setTranscript(userText);
            setConversation((previous) => [
              ...previous,
              { id: createConversationId(), speaker: "user", text: userText },
              {
                id: assistantId,
                speaker: "assistant",
                text: "",
                isPending: true,
              },
            ]);
          }
          setAssistantText(null);
          setStatus("thinking");
          armResponseTimeout();
          return;
        case "stt_partial":
          // Android SpeechRecognizer emits this locally while the person is
          // talking. It is intentionally not sent to the LLM until final.
          setTranscript(event.text || null);
          recordVoiceActivity();
          setStatus("listening");
          return;
        case "thinking":
          // SpeechRecognizer has ended the user's turn and Xiaozhi is now
          // resolving the answer/tool call.
          setStatus("thinking");
          return;
        case "tts":
          const segment = event.text?.trim();
          if (segment && segment.toLowerCase() !== "none") {
            setAssistantText((previous) => {
              if (
                !previous ||
                previous === segment ||
                previous.endsWith(segment)
              ) {
                return segment;
              }
              return `${previous} ${segment}`;
            });
            setConversation((previous) => {
              const pendingId = pendingAssistantIdRef.current;
              if (!pendingId) return previous;
              return previous.map((entry) =>
                entry.id === pendingId
                  ? {
                      ...entry,
                      text: entry.text ? `${entry.text} ${segment}` : segment,
                      isPending: false,
                    }
                  : entry,
              );
            });
          }
          if (event.state === "start" || event.state === "sentence_start") {
            clearResponseTimer();
            setError(null);
            setStatus("speaking");
          }
          // Native Android TTS emits `listening` only after its full queue is
          // finished. Do not claim the mic is ready while LiBot is speaking.
          return;
        case "tool_result": {
          const toolResult = toVoiceToolResult(event);
          const pendingId = pendingAssistantIdRef.current;
          if (toolResult && pendingId) {
            setConversation((previous) =>
              previous.map((entry) =>
                entry.id === pendingId ? { ...entry, toolResult } : entry,
              ),
            );
          }
          return;
        }
        case "guidance_started": {
          const { jobId, executionId, guidanceKind, startStatus, destinationId, destinationName, runtimeId } = event;
          if (!jobId || !executionId || !destinationId || !destinationName || !runtimeId ||
            (guidanceKind !== "BOOK_GUIDANCE" && guidanceKind !== "LOCATION_GUIDANCE") ||
            (startStatus !== "ACCEPTED" && startStatus !== "FAILED")) return;
          clearResponseTimer();
          setGuidanceStart({ jobId, executionId, guidanceKind, startStatus, destinationId, destinationName, runtimeId });
          return;
        }
        case "disconnected":
          if (wantsSessionRef.current) {
            setStatus("disconnected");
            void reconnect();
          }
          return;
        case "error":
          greetingInProgressRef.current = false;
          setError(event.text || "Xiaozhi gặp lỗi âm thanh.");
          setStatus("error");
          return;
      }
    },
    [armResponseTimeout, clearResponseTimer, reconnect, recordVoiceActivity],
  );

  const resetLocalSession = useCallback(() => {
    wantsSessionRef.current = false;
    clearReconnectTimer();
    clearResponseTimer();
    reconnectAttemptRef.current = 0;
    hasGreetedRef.current = false;
    greetingInProgressRef.current = false;
    greetingRef.current = OPENING_GREETING;
    pendingAssistantIdRef.current = null;
    setStatus("idle");
    setTranscript(null);
    setAssistantText(null);
    setVoiceActivitySequence(0);
    setConversation([]);
    setGuidanceStart(null);
  }, [clearReconnectTimer, clearResponseTimer]);

  const stop = useCallback(async (): Promise<void> => {
    resetLocalSession();
    setStatus("ending");
    if (nativeSessionEndedRef.current) return;
    if (!endingPromiseRef.current) {
      nativeSessionEndedRef.current = true;
      endingPromiseRef.current = Promise.resolve(XiaozhiAudio?.endSession())
        .catch(() => {
          // The modal can still close if Android has already torn the session down.
        })
        .finally(() => {
          endingPromiseRef.current = null;
        });
    }
    await endingPromiseRef.current;
  }, [resetLocalSession]);

  const start = useCallback(async (greeting = OPENING_GREETING) => {
    await endingPromiseRef.current;
    resetLocalSession();
    nativeSessionEndedRef.current = false;
    wantsSessionRef.current = true;
    hasGreetedRef.current = false;
    greetingInProgressRef.current = false;
    greetingRef.current = greeting;
    setError(null);
    try {
      await requestMicrophonePermission();
      await connect();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể bắt đầu cuộc trò chuyện.",
      );
      setStatus("error");
    }
  }, [connect, resetLocalSession]);

  useEffect(() => {
    const subscription = addXiaozhiEventListener(handleEvent);
    return () => {
      subscription?.remove();
      void stop();
    };
  }, [handleEvent, stop]);

  return {
    status,
    error,
    transcript,
    assistantText,
    voiceActivitySequence,
    conversation,
    guidanceStart,
    start,
    stop,
  };
}
