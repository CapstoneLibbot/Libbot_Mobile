import { ACTIVE_WAKE_WORD_KEYWORD } from "../wakeword/constants/wakeWordConfig";

export const WAKE_WORD_PHASES = [
  "loading_model",
  "starting_listener",
  "listening",
  "retry_wait",
  "stopping",
  "paused_for_voice",
  "error",
] as const;

export type WakeWordPhase = (typeof WAKE_WORD_PHASES)[number];

export const WAKE_WORD_STATUS_LABEL: Record<WakeWordPhase, string> = {
  loading_model: `Đang chuẩn bị nhận diện ${ACTIVE_WAKE_WORD_KEYWORD}`,
  starting_listener: `Đang bật nhận diện ${ACTIVE_WAKE_WORD_KEYWORD}`,
  listening: `Đang lắng nghe ${ACTIVE_WAKE_WORD_KEYWORD}`,
  retry_wait: `Đang khởi động lại nhận diện ${ACTIVE_WAKE_WORD_KEYWORD}`,
  stopping: "Đang chuyển sang trò chuyện với robot",
  paused_for_voice: "Đang trò chuyện với robot",
  error: `Nhận diện ${ACTIVE_WAKE_WORD_KEYWORD} đang gặp lỗi`,
};
