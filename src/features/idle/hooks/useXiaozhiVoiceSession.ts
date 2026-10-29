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

export { type VoiceToolResult } from "../utils/voiceToolResult";

export type XiaozhiVoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "disconnected"
  | "error";

export interface VoiceConversationEntry {
  id: string;
  speaker: "user" | "assistant";
  text: string;
  isPending?: boolean;
  toolResult?: VoiceToolResult;
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
  const [conversation, setConversation] = useState<VoiceConversationEntry[]>(
    [],
  );
  const wantsSessionRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasGreetedRef = useRef(false);
  const greetingInProgressRef = useRef(false);
  const pendingAssistantIdRef = useRef<string | null>(null);

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
        case "connected":
          reconnectAttemptRef.current = 0;
          setError(null);
          if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            greetingInProgressRef.current = true;
            setAssistantText(OPENING_GREETING);
            setConversation([
              {
                id: createConversationId(),
                speaker: "assistant",
                text: OPENING_GREETING,
              },
            ]);
            setStatus("speaking");
            void XiaozhiAudio?.speakGreeting(OPENING_GREETING);
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
    [armResponseTimeout, clearResponseTimer, reconnect],
  );

  const stop = useCallback(() => {
    wantsSessionRef.current = false;
    clearReconnectTimer();
    clearResponseTimer();
    reconnectAttemptRef.current = 0;
    hasGreetedRef.current = false;
    greetingInProgressRef.current = false;
    pendingAssistantIdRef.current = null;
    void XiaozhiAudio?.disconnect();
    setStatus("idle");
    setTranscript(null);
    setAssistantText(null);
    setConversation([]);
  }, [clearReconnectTimer, clearResponseTimer]);

  const start = useCallback(async () => {
    stop();
    wantsSessionRef.current = true;
    hasGreetedRef.current = false;
    greetingInProgressRef.current = false;
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
  }, [connect, stop]);

  useEffect(() => {
    const subscription = addXiaozhiEventListener(handleEvent);
    return () => {
      subscription?.remove();
      stop();
    };
  }, [handleEvent, stop]);

  return {
    status,
    error,
    transcript,
    assistantText,
    conversation,
    start,
    stop,
  };
}
