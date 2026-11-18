import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VOSK_MODEL_NAME,
  DEFAULT_VOSK_WAKE_GRAMMAR,
  createWakeWordDetector,
  isWakeWordMatch,
} from "../constants/voskWakeWordConfig";

vi.mock("react-native-vosk", () => ({
  loadModel: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  unload: vi.fn(),
  onResult: vi.fn(() => ({ remove: vi.fn() })),
  onPartialResult: vi.fn(() => ({ remove: vi.fn() })),
  onError: vi.fn(() => ({ remove: vi.fn() })),
  onTimeout: vi.fn(() => ({ remove: vi.fn() })),
  onFinalResult: vi.fn(() => ({ remove: vi.fn() })),
}));

describe("voskWakeWordConfig - grammar and matching logic", () => {
  it("defines default model name as model-vn-vn", () => {
    expect(DEFAULT_VOSK_MODEL_NAME).toBe("model-vn-vn");
  });

  it("contains only full 3-syllable Hey LiBot transcript aliases in the grammar", () => {
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).toContain("hey li bot");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).toContain("hê li bốt");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).toContain("hây li bót");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).not.toContain("hey bot");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).not.toContain("li bot");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).not.toContain("bốt");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).not.toContain("libot");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).not.toContain("li bot ơi");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).not.toContain("robot");
    expect(DEFAULT_VOSK_WAKE_GRAMMAR).toContain("[unk]");
  });

  it("recognizes only complete 3-syllable Hey LiBot transcript variants", () => {
    expect(isWakeWordMatch("hey li bot")).toBe(true);
    expect(isWakeWordMatch("hey li bốt")).toBe(true);
    expect(isWakeWordMatch("hey li bót")).toBe(true);
    expect(isWakeWordMatch("hê li bot")).toBe(true);
    expect(isWakeWordMatch("hê li bót")).toBe(true);
    expect(isWakeWordMatch("hây li bốt")).toBe(true);
    expect(isWakeWordMatch("   Hê Li Bốt   ")).toBe(true);
  });

  it("rejects 2-syllable phrases, 1-syllable noises, ê-variants, multi-word chatter, and ambient speech", () => {
    expect(isWakeWordMatch("[unk]")).toBe(false);
    expect(isWakeWordMatch("")).toBe(false);
    expect(isWakeWordMatch(null)).toBe(false);
    expect(isWakeWordMatch(undefined)).toBe(false);
    expect(isWakeWordMatch("ê li bốt")).toBe(false);
    expect(isWakeWordMatch("ê li bot")).toBe(false);
    expect(isWakeWordMatch("hey bốt")).toBe(false);
    expect(isWakeWordMatch("hê bốt")).toBe(false);
    expect(isWakeWordMatch("hây bốt")).toBe(false);
    expect(isWakeWordMatch("li bot")).toBe(false);
    expect(isWakeWordMatch("li bốt")).toBe(false);
    expect(isWakeWordMatch("bốt")).toBe(false);
    expect(isWakeWordMatch("bot")).toBe(false);
    expect(isWakeWordMatch("hey")).toBe(false);
    expect(isWakeWordMatch("hê")).toBe(false);
    expect(isWakeWordMatch("tôi muốn mượn sách")).toBe(false);
    expect(isWakeWordMatch("thư viện ở đâu")).toBe(false);
    expect(isWakeWordMatch("robot ơi")).toBe(false);
    expect(isWakeWordMatch("libot")).toBe(false);
    expect(isWakeWordMatch("li bot ơi")).toBe(false);
    expect(isWakeWordMatch("tôi gọi hey li bot nhé")).toBe(false);
    // Chuỗi dài từ hội thoại phòng chứa các mảnh âm thanh tuyệt đối không được kích hoạt:
    expect(isWakeWordMatch("hây hê li bốt")).toBe(false);
    expect(isWakeWordMatch("li bót li bốt bốt li hey li bot")).toBe(false);
    expect(isWakeWordMatch("thế rồi hây hê li bốt")).toBe(false);
  });

  it("accepts two-part sequence of 2-syllable prefix followed by 1-syllable end (Hey Li + Bot)", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("hey li")).toBe(false);
    timestamp += 600;
    expect(detector.consume("bốt")).toBe(true);
  });

  it("handles fluctuating ASR partials where 2-syllable prefix is followed by a 1-syllable jitter before ending (e.g. 'hây li' -> 'hây' -> 'bốt')", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("hây li")).toBe(false);
    timestamp += 196;
    expect(detector.consume("hây")).toBe(false);
    timestamp += 242;
    expect(detector.consume("bốt")).toBe(true);
  });

  it("rejects 1-syllable prefix alone to prevent room chatter false triggers", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("hey")).toBe(false);
    timestamp += 400;
    expect(detector.consume("bốt")).toBe(false);
  });

  it("rejects two-part sequence that lacks Li (Hey + Bot = only 2 syllables)", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("hey")).toBe(false);
    timestamp += 400;
    expect(detector.consume("bốt")).toBe(false);
  });

  it("does not trigger on prefix alone, even if repeated or delayed", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("hey li")).toBe(false);
    timestamp += 200;
    expect(detector.consume("hey li")).toBe(false);
    timestamp += 300;
    expect(detector.consume("hey li")).toBe(false);
  });

  it("expires prefix after 900ms window", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("hey li")).toBe(false);
    timestamp += 901;
    expect(detector.consume("bốt")).toBe(false);
  });

  it("rejects suffix alone without prefix", () => {
    let timestamp = 1_000;
    const detector = createWakeWordDetector(() => timestamp);

    expect(detector.consume("bốt")).toBe(false);
    expect(detector.consume("li bot")).toBe(false);
  });
});
