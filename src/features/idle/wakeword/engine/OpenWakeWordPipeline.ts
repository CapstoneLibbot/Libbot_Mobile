import {
  WAKE_WORD_CONFIG,
  type WakeWordConfig,
} from "../constants/wakeWordConfig";
import { type DetectionResult } from "../domain/wakeWordTypes";

export interface PipelineOptions {
  config?: WakeWordConfig;
  threshold?: number;
  onDetect?: (result: DetectionResult) => void;
}

/**
 * Trình theo dõi xác suất và phát hiện từ khóa nhiều frame liên tiếp (Consecutive Frames Filter).
 * Giúp triệt tiêu hoàn toàn kích hoạt nhầm (false positives) từ tiếng ồn môi trường.
 */
export function createWakeWordDetector(
  threshold: number = WAKE_WORD_CONFIG.threshold,
  consecutiveRequired: number = WAKE_WORD_CONFIG.consecutiveFramesRequired,
  keyword: string = WAKE_WORD_CONFIG.keyword,
) {
  let consecutiveHits = 0;
  let lastScore = 0;

  const reset = () => {
    consecutiveHits = 0;
    lastScore = 0;
  };

  const processScore = (score: number): DetectionResult => {
    lastScore = score;
    if (score >= threshold) {
      consecutiveHits += 1;
      if (consecutiveHits >= consecutiveRequired) {
        reset();
        return {
          score,
          isDetected: true,
          keyword,
        };
      }
    } else {
      consecutiveHits = 0;
    }

    return {
      score,
      isDetected: false,
      keyword,
    };
  };

  return {
    processScore,
    reset,
    getConsecutiveHits: () => consecutiveHits,
    getLastScore: () => lastScore,
  };
}

/**
 * Hàng đệm tích lũy âm thanh PCM (Audio Chunk Buffer).
 * Đảm bảo các khối âm thanh nạp vào mạng nơ-ron luôn đạt đúng kích thước frame chuẩn
 * (mặc định 1280 mẫu / 80ms tại 16kHz).
 */
export function createAudioFrameBuffer(
  frameSize: number = WAKE_WORD_CONFIG.frameSize,
) {
  let buffer: number[] = [];

  const appendAndDrain = (
    incoming: Float32Array | number[],
    onFrame: (frame: Float32Array) => void,
  ) => {
    for (let i = 0; i < incoming.length; i++) {
      buffer.push(incoming[i]);
    }

    while (buffer.length >= frameSize) {
      const frameData = buffer.splice(0, frameSize);
      onFrame(new Float32Array(frameData));
    }
  };

  const clear = () => {
    buffer = [];
  };

  return {
    appendAndDrain,
    clear,
    getBufferSize: () => buffer.length,
  };
}
