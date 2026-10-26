import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  mediaDevices,
  RTCPeerConnection,
  type MediaStream,
} from "react-native-webrtc";
import { env } from "@/config";

export type RealtimeVoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "stopping"
  | "error";

const CLOSE_TIMEOUT_MS = 15_000;
const ICE_GATHERING_TIMEOUT_MS = 10_000;

function getSessionErrorMessage(body: string, status: number): string {
  try {
    const problem = JSON.parse(body) as { detail?: string; title?: string };
    if (problem.detail) return problem.detail;
    if (problem.title) return problem.title;
  } catch {
    // The endpoint may return plain text for validation failures.
  }
  return body || `LiBot trả về lỗi ${status}.`;
}

function realtimeSessionUrl(): string {
  if (!env.apiBaseUrl) {
    throw new Error(
      "Chưa cấu hình EXPO_PUBLIC_API_BASE_URL để kết nối LiBot.",
    );
  }
  return `${env.apiBaseUrl}/realtime/sessions`;
}

async function requestMicrophonePermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  const permission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Bạn cần cấp quyền microphone để nói chuyện với LiBot.");
  }
}

function waitForIceGathering(connection: RTCPeerConnection): Promise<boolean> {
  if (connection.iceGatheringState === "complete") return Promise.resolve(true);

  return new Promise((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    const onStateChange = () => {
      if (connection.iceGatheringState === "complete") finish();
    };
    const finish = () => {
      clearTimeout(timeout);
      connection.removeEventListener("icegatheringstatechange", onStateChange);
      resolve(connection.iceGatheringState === "complete");
    };
    timeout = setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);
    connection.addEventListener("icegatheringstatechange", onStateChange);
  });
}

/**
 * Creates a WebRTC peer connection to the LiBot Realtime endpoint. Audio media
 * flows directly between the device and OpenAI; LiBot retains control of tools
 * through its private sideband connection.
 */
export function useRealtimeVoiceSession() {
  const [status, setStatus] = useState<RealtimeVoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<RTCPeerConnection["createDataChannel"]> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    channelRef.current?.close();
    channelRef.current = null;
    connectionRef.current?.close();
    connectionRef.current = null;
    microphoneRef.current?.getTracks().forEach((track) => track.stop());
    microphoneRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (!connectionRef.current) {
      cleanup();
      setStatus("idle");
      return;
    }

    setStatus("stopping");
    if (channelRef.current?.readyState === "open") {
      channelRef.current.send(JSON.stringify({ type: "session.close" }));
      closeTimerRef.current = setTimeout(() => {
        cleanup();
        setStatus("idle");
      }, CLOSE_TIMEOUT_MS);
      return;
    }

    cleanup();
    setStatus("idle");
  }, [cleanup]);

  const start = useCallback(async () => {
    cleanup();
    setError(null);
    setStatus("connecting");

    try {
      await requestMicrophonePermission();
      const connection = new RTCPeerConnection();
      connectionRef.current = connection;
      connection.onconnectionstatechange = () => {
        if (connection.connectionState !== "failed") return;
        cleanup();
        setError("Kết nối giọng nói đã thất bại. Vui lòng thử lại.");
        setStatus("error");
      };

      const events = connection.createDataChannel("oai-events");
      channelRef.current = events;
      events.onmessage = (event) => {
        try {
          const message = JSON.parse((event as unknown as { data: string }).data) as { type?: string };
          if (message.type === "session.closed") {
            cleanup();
            setStatus("idle");
          }
        } catch {
          // Non-JSON data-channel events are not used by this session.
        }
      };

      const microphone = await mediaDevices.getUserMedia({ audio: true, video: false });
      microphoneRef.current = microphone;
      microphone.getTracks().forEach((track) => connection.addTrack(track, microphone));

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      const gatheringCompleted = await waitForIceGathering(connection);
      if (!gatheringCompleted) {
        throw new Error(
          "Kết nối mạng chưa hoàn tất. Vui lòng kiểm tra mạng rồi thử lại.",
        );
      }
      if (!connection.localDescription?.sdp) {
        throw new Error("Không thể tạo yêu cầu kết nối giọng nói.");
      }

      const response = await fetch(realtimeSessionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: connection.localDescription.sdp,
      });
      const answerSdp = await response.text();
      if (!response.ok) {
        throw new Error(getSessionErrorMessage(answerSdp, response.status));
      }

      await connection.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setStatus("connected");
    } catch (cause) {
      cleanup();
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể bắt đầu cuộc trò chuyện.",
      );
      setStatus("error");
    }
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { status, error, start, stop };
}
