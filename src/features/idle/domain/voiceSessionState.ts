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
    title: "LiBot đang chuẩn bị",
    description: "Đang khởi tạo cuộc trò chuyện…",
  },
  connecting: {
    title: "LiBot đang kết nối",
    description: "Đang kết nối trợ lý giọng nói…",
  },
  listening: {
    title: "LiBot đang lắng nghe",
    description: "Bạn có thể nói tên sách, tác giả hoặc khu vực bạn muốn tìm",
  },
  thinking: {
    title: "LiBot đang tìm thông tin",
    description: "Đang tìm thông tin trong thư viện…",
  },
  speaking: {
    title: "LiBot đang trả lời",
    description: "LiBot đang trả lời…",
  },
  disconnected: {
    title: "LiBot đang kết nối lại",
    description: "Đang khôi phục cuộc trò chuyện…",
  },
  ending: {
    title: "LiBot đang kết thúc cuộc trò chuyện",
    description: "Đang giải phóng microphone…",
  },
  error: {
    title: "LiBot cần được thử lại",
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
