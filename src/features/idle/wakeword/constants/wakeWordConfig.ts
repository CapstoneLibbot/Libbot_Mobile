/**
 * Cấu hình từ khóa và tham số suy luận cho openWakeWord.
 */
export const ACTIVE_WAKE_WORD_KEYWORD = "Hey Siri";

export const WAKE_WORD_CONFIG = {
  keyword: ACTIVE_WAKE_WORD_KEYWORD,
  threshold: 0.5, // 50% theo benchmark của openWakeWord
  sampleRate: 16000,
  frameSize: 1280, // 80ms audio chunk tại 16kHz (1280 mẫu)
  consecutiveFramesRequired: 2, // Yêu cầu vượt ngưỡng 2 frame liên tiếp để triệt tiêu false positive
  models: {
    melspectrogram: "melspectrogram.onnx",
    embedding: "embedding_model.onnx",
    classifier: "hey_siri.onnx",
  },
} as const;

export type WakeWordConfig = typeof WAKE_WORD_CONFIG;
