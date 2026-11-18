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
  loading_model: "Đang chuẩn bị nhận diện Hey LiBot",
  starting_listener: "Đang bật nhận diện Hey LiBot",
  listening: "LiBot đang lắng nghe Hey LiBot",
  retry_wait: "Đang khởi động lại nhận diện Hey LiBot",
  stopping: "Đang chuyển sang trò chuyện với LiBot",
  paused_for_voice: "LiBot đang trò chuyện",
  error: "Nhận diện Hey LiBot đang gặp lỗi",
};
