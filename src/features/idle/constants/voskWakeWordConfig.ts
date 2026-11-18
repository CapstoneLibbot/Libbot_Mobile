/**
 * Cấu hình từ khóa Wake Word và ngữ pháp tiếng Việt cho mô hình Vosk offline.
 *
 * Lưu ý về từ điển Vosk tiếng Việt:
 * Đây là các transcript ASR có thể có của duy nhất câu kích hoạt "Hey LiBot" (3 âm tiết).
 * Mọi kết quả không chứa đầy đủ 3 âm tiết (Tiền tố Hey/Hê + Li/Ly + Bot/Bốt) đều bị từ chối,
 * nhằm triệt tiêu hoàn toàn false positive từ tiếng ồn môi trường và hội thoại thông thường.
 */

export const DEFAULT_VOSK_MODEL_NAME = "model-vn-vn";

export const DEFAULT_VOSK_WAKE_GRAMMAR: readonly string[] = [
  "hey li bot",
  "hey li bốt",
  "hey li bót",
  "hê li bot",
  "hê li bốt",
  "hê li bót",
  "hây li bot",
  "hây li bốt",
  "hây li bót",
  "ê li bot",
  "ê li bốt",
  "ê li bót",
  "hey ly bot",
  "hey ly bốt",
  "hey ly bót",
  "hê ly bot",
  "hê ly bốt",
  "hê ly bót",
  "[unk]",
];

const WAKE_WORD_TRANSCRIPTS = new Set([
  "hey li bot",
  "hey li bốt",
  "hey li bót",
  "hê li bot",
  "hê li bốt",
  "hê li bót",
  "hây li bot",
  "hây li bốt",
  "hây li bót",
  "ê li bot",
  "ê li bốt",
  "ê li bót",
  "hey ly bot",
  "hey ly bốt",
  "hey ly bót",
  "hê ly bot",
  "hê ly bốt",
  "hê ly bót",
]);

// Tiền tố 2 âm tiết: "hey li", "hê li", v.v.
const TWO_SYLLABLE_PREFIXES = new Set([
  "hey li",
  "hê li",
  "hây li",
  "ê li",
  "hey ly",
  "hê ly",
  "hây ly",
  "ê ly",
]);

// Tiền tố 1 âm tiết: "hey", "hê"
const ONE_SYLLABLE_PREFIXES = new Set([
  "hey",
  "hê",
  "hây",
  "ê",
]);

// Hậu tố 1 âm tiết: chỉ hợp lệ khi ĐÃ CÓ tiền tố 2 âm tiết ("hey li" + "bốt" => 3 âm)
const ONE_SYLLABLE_ENDS = new Set([
  "bot",
  "bốt",
  "bót",
]);

// Hậu tố 2 âm tiết: hợp lệ khi có tiền tố 1 âm tiết ("hey" + "li bốt" => 3 âm) hoặc 2 âm tiết
const TWO_SYLLABLE_ENDS = new Set([
  "li bot",
  "li bốt",
  "li bót",
  "ly bot",
  "ly bốt",
  "ly bót",
]);

const PARTIAL_SEQUENCE_WINDOW_MS = 2_000;

function normalizeTranscript(text: string | null | undefined): string {
  return text?.toLowerCase().trim().replace(/\s+/g, " ") ?? "";
}

/**
 * Chấp nhận transcript của "Hey LiBot" (chỉ nhận khi có đầy đủ 3 âm tiết
 * hoặc khi chuỗi tích lũy trước đó kết thúc bằng câu 3 âm tiết đầy đủ).
 * Không nhận các từ đơn lẻ hoặc cụm 2 từ (như "libot", "robot ơi", "hey bốt", "li bot").
 */
export function isWakeWordMatch(text: string | null | undefined): boolean {
  const normalized = normalizeTranscript(text);
  if (!normalized || normalized === "[unk]") return false;

  if (WAKE_WORD_TRANSCRIPTS.has(normalized)) return true;

  // Hỗ trợ trường hợp Vosk tích lũy chuỗi âm liên tục trước đó:
  // Ví dụ: "... hey li bot" hoặc "... hê li bốt"
  for (const trigger of WAKE_WORD_TRANSCRIPTS) {
    if (normalized.endsWith(` ${trigger}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Detector quản lý trạng thái ghép âm cho luồng ASR trực tiếp:
 * - Khớp ngay khi nhận diện được câu đầy đủ 3 từ.
 * - Hoặc ghép chuỗi 2 phần nếu người dùng nói ngắt quãng:
 *   + "Hey Li" (2 âm) + "Bot/Bốt" (1 âm) => kích hoạt.
 *   + "Hey" (1 âm) + "LiBot/Li Bốt" (2 âm) => kích hoạt.
 * - Mọi trường hợp thiếu âm (chỉ nói "Hey Li" rồi dừng, chỉ nói "Bốt", chỉ nói "Hey Bốt")
 *   đều bị từ chối để chống false positive tuyệt đối trong môi trường kiosk.
 */
export function createWakeWordDetector(now: () => number = Date.now) {
  let prefixType: "one_syllable" | "two_syllable" | null = null;
  let prefixDetectedAt: number | null = null;

  const reset = () => {
    prefixType = null;
    prefixDetectedAt = null;
  };

  return {
    reset,
    consume(text: string | null | undefined): boolean {
      const normalized = normalizeTranscript(text);
      if (!normalized || normalized === "[unk]") return false;

      // 1. Khớp trực tiếp đầy đủ 3 từ
      if (isWakeWordMatch(normalized)) {
        reset();
        return true;
      }

      const timestamp = now();

      // 2. Kiểm tra nếu là tiền tố 2 âm tiết ("hey li", "hê li", "hây li")
      const isTwoSyllablePrefix =
        TWO_SYLLABLE_PREFIXES.has(normalized) ||
        Array.from(TWO_SYLLABLE_PREFIXES).some((p) =>
          normalized.endsWith(` ${p}`),
        );

      if (isTwoSyllablePrefix) {
        prefixType = "two_syllable";
        prefixDetectedAt = timestamp;
        return false;
      }

      const hasRecentPrefix =
        prefixDetectedAt !== null &&
        timestamp - prefixDetectedAt <= PARTIAL_SEQUENCE_WINDOW_MS;

      // 3. Kiểm tra nếu là tiền tố 1 âm tiết ("hey", "hê", "hây")
      const isOneSyllablePrefix =
        ONE_SYLLABLE_PREFIXES.has(normalized) ||
        Array.from(ONE_SYLLABLE_PREFIXES).some((p) =>
          normalized.endsWith(` ${p}`),
        );

      if (isOneSyllablePrefix) {
        // Chỉ lưu 1 âm tiết nếu trước đó chưa có tiền tố 2 âm tiết đang hoạt động
        // (Tránh trường hợp ASR partial dao động rút gọn tạm thời làm mất tiền tố 2 âm đã nhận)
        if (!hasRecentPrefix || prefixType !== "two_syllable") {
          prefixType = "one_syllable";
          prefixDetectedAt = timestamp;
        }
        return false;
      }

      if (hasRecentPrefix) {
        const isOneSyllableEnd =
          ONE_SYLLABLE_ENDS.has(normalized) ||
          Array.from(ONE_SYLLABLE_ENDS).some((e) =>
            normalized.endsWith(` ${e}`),
          );

        const isTwoSyllableEnd =
          TWO_SYLLABLE_ENDS.has(normalized) ||
          Array.from(TWO_SYLLABLE_ENDS).some((e) =>
            normalized.endsWith(` ${e}`),
          );

        // Quy tắc: Luôn phải đủ tổng cộng 3 âm tiết!
        // - "hey li" (2 âm) + "bốt" (1 âm) => ĐỦ 3 âm tiết
        // - "hey" (1 âm) + "li bốt" (2 âm) => ĐỦ 3 âm tiết
        // - "hey li" (2 âm) + "li bốt" (2 âm) => ĐỦ 3+ âm tiết
        const isCompletedSequence =
          (prefixType === "two_syllable" && (isOneSyllableEnd || isTwoSyllableEnd)) ||
          (prefixType === "one_syllable" && isTwoSyllableEnd);

        if (isCompletedSequence) {
          reset();
          return true;
        }
      }

      if (!hasRecentPrefix) {
        reset();
      }
      return false;
    },
  };
}
