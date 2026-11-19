export const VOICE_SESSION_PHASES = [
  "idle",
  "connecting",
  "listening",
  "thinking",
  "speaking",
  "disconnected",
  "ending",
  "error",
] as const;

export type VoiceSessionPhase = (typeof VOICE_SESSION_PHASES)[number];

type VoiceSessionCopy = {
  title: string;
  description: string;
};

/** The only presentation mapping for a live Xiaozhi conversation. */
export const VOICE_SESSION_COPY: Record<VoiceSessionPhase, VoiceSessionCopy> = {
  idle: {
    title: "Đang chuẩn bị",
    description: "Đang khởi tạo cuộc trò chuyện…",
  },
  connecting: {
    title: "Đang kết nối",
    description: "Đang kết nối trợ lý giọng nói…",
  },
  listening: {
    title: "Đang lắng nghe",
    description: "Bạn có thể nói tên sách hoặc khu vực bạn muốn tìm",
  },
  thinking: {
    title: "Đang tìm thông tin",
    description: "Đang tìm thông tin trong thư viện…",
  },
  speaking: {
    title: "Đang trả lời",
    description: "Robot đang trả lời…",
  },
  disconnected: {
    title: "Đang kết nối lại",
    description: "Đang khôi phục cuộc trò chuyện…",
  },
  ending: {
    title: "Đang kết thúc cuộc trò chuyện",
    description: "Đang giải phóng microphone…",
  },
  error: {
    title: "Cần thử lại",
    description: "Vui lòng đóng và thử lại.",
  },
};

export function getVoiceSessionCopy(
  phase: VoiceSessionPhase,
  error: string | null,
): VoiceSessionCopy {
  const copy = VOICE_SESSION_COPY[phase];
  return error ? { ...copy, description: error } : copy;
}
