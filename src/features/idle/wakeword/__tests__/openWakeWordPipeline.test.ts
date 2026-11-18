import { describe, expect, it } from "vitest";
import {
  createAudioFrameBuffer,
  createWakeWordDetector,
} from "../engine/OpenWakeWordPipeline";

describe("OpenWakeWordPipeline - createWakeWordDetector", () => {
  it("does not trigger when confidence score is below threshold", () => {
    const detector = createWakeWordDetector(0.5, 2, "Hey Siri");

    const result1 = detector.processScore(0.3);
    expect(result1.isDetected).toBe(false);
    expect(detector.getConsecutiveHits()).toBe(0);

    const result2 = detector.processScore(0.49);
    expect(result2.isDetected).toBe(false);
    expect(detector.getConsecutiveHits()).toBe(0);
  });

  it("requires consecutive hits to trigger wake word, preventing false triggers", () => {
    const detector = createWakeWordDetector(0.5, 2, "Hey Siri");

    // Frame 1: score = 0.8 (vượt ngưỡng nhưng mới là 1 frame)
    const result1 = detector.processScore(0.8);
    expect(result1.isDetected).toBe(false);
    expect(detector.getConsecutiveHits()).toBe(1);

    // Frame 2: score = 0.85 (đủ 2 frame liên tiếp -> kích hoạt!)
    const result2 = detector.processScore(0.85);
    expect(result2.isDetected).toBe(true);
    expect(result2.keyword).toBe("Hey Siri");
    expect(detector.getConsecutiveHits()).toBe(0); // Tự động reset sau khi kích hoạt
  });

  it("resets consecutive counter when a frame falls below threshold", () => {
    const detector = createWakeWordDetector(0.5, 2, "Hey Siri");

    // Frame 1: vượt ngưỡng
    detector.processScore(0.75);
    expect(detector.getConsecutiveHits()).toBe(1);

    // Frame 2: rớt xuống dưới ngưỡng (tiếng ồn gián đoạn)
    const result2 = detector.processScore(0.2);
    expect(result2.isDetected).toBe(false);
    expect(detector.getConsecutiveHits()).toBe(0);

    // Frame 3: lại vượt ngưỡng nhưng phải đếm lại từ đầu
    const result3 = detector.processScore(0.9);
    expect(result3.isDetected).toBe(false);
    expect(detector.getConsecutiveHits()).toBe(1);
  });

  it("allows manual reset of detector state", () => {
    const detector = createWakeWordDetector(0.5, 2, "Hey Siri");
    detector.processScore(0.7);
    expect(detector.getConsecutiveHits()).toBe(1);

    detector.reset();
    expect(detector.getConsecutiveHits()).toBe(0);
    expect(detector.getLastScore()).toBe(0);
  });
});

describe("OpenWakeWordPipeline - createAudioFrameBuffer", () => {
  it("buffers incoming audio chunks and emits frames of exact frameSize (1280 samples)", () => {
    const frameBuffer = createAudioFrameBuffer(1280);
    const emittedFrames: Float32Array[] = [];

    // Nạp một chunk 1000 mẫu (chưa đủ 1280)
    frameBuffer.appendAndDrain(new Float32Array(1000), (f) =>
      emittedFrames.push(f),
    );
    expect(emittedFrames.length).toBe(0);
    expect(frameBuffer.getBufferSize()).toBe(1000);

    // Nạp tiếp một chunk 1000 mẫu (tổng 2000 -> xả 1 frame 1280, còn dư 720)
    frameBuffer.appendAndDrain(new Float32Array(1000), (f) =>
      emittedFrames.push(f),
    );
    expect(emittedFrames.length).toBe(1);
    expect(emittedFrames[0].length).toBe(1280);
    expect(frameBuffer.getBufferSize()).toBe(720);

    // Nạp tiếp 600 mẫu (720 + 600 = 1320 -> xả thêm 1 frame 1280, còn dư 40)
    frameBuffer.appendAndDrain(new Float32Array(600), (f) =>
      emittedFrames.push(f),
    );
    expect(emittedFrames.length).toBe(2);
    expect(emittedFrames[1].length).toBe(1280);
    expect(frameBuffer.getBufferSize()).toBe(40);
  });

  it("clears accumulated buffer correctly", () => {
    const frameBuffer = createAudioFrameBuffer(1280);
    frameBuffer.appendAndDrain(new Float32Array(500), () => {});
    expect(frameBuffer.getBufferSize()).toBe(500);

    frameBuffer.clear();
    expect(frameBuffer.getBufferSize()).toBe(0);
  });
});
