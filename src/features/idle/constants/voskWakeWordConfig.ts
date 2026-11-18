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
  "hey ly bot",
  "hey ly bốt",
  "hey ly bót",
  "hê ly bot",
  "hê ly bốt",
  "hê ly bót",
]);

// Tiền tố bắt buộc phải có tối thiểu 2 âm tiết rõ ràng: "hey li", "hê li", v.v.
// Tuyệt đối không chấp nhận âm đơn lẻ "ê" hoặc "hê" để ngăn chặn hội thoại phòng kích hoạt nhầm.
const TWO_SYLLABLE_PREFIXES = new Set([
  "hey li",
  "hê li",
  "hây li",
  "hey ly",
  "hê ly",
  "hây ly",
]);

// Hậu tố 1 âm tiết: chỉ hợp lệ khi ĐÃ CÓ tiền tố 2 âm tiết ("hey li" + "bốt" => 3 âm)
const ONE_SYLLABLE_ENDS = new Set([
  "bot",
  "bốt",
  "bót",
]);

// Hậu tố 2 âm tiết: "li bot", "li bốt", v.v.
const TWO_SYLLABLE_ENDS = new Set([
  "li bot",
  "li bốt",
  "li bót",
  "ly bot",
  "ly bốt",
  "ly bót",
]);

// Cửa sổ ghép âm: 900ms.
// Người nói "Hey LiBot" bình thường phát âm trong khoảng 600 - 800ms.
// Cửa sổ 900ms đảm bảo người gọi robot được nhận diện mượt mà, đồng thời ngăn chặn
// hai câu nói ngẫu nhiên của hai người khác nhau trong phòng bị ghép vào nhau.
const PARTIAL_SEQUENCE_WINDOW_MS = 900;

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
 * - Khớp ngay khi nhận diện được câu đầy đủ 3 từ ("Hey LiBot").
 * - Hoặc ghép chuỗi: Phải bắt đầu bằng tiền tố 2 âm tiết ("Hey Li") và theo sau là hậu tố ("Bot")
 *   trong vòng 900ms.
 * - Tuyệt đối không nhận tiền tố 1 âm tiết đơn lẻ ("hê", "ê") để tránh kích hoạt từ hội thoại phòng.
 */
export function createWakeWordDetector(now: () => number = Date.now) {
  let hasTwoSyllablePrefix = false;
  let prefixDetectedAt: number | null = null;

  const reset = () => {
    hasTwoSyllablePrefix = false;
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
        hasTwoSyllablePrefix = true;
        prefixDetectedAt = timestamp;
        return false;
      }

      const hasRecentPrefix =
        hasTwoSyllablePrefix &&
        prefixDetectedAt !== null &&
        timestamp - prefixDetectedAt <= PARTIAL_SEQUENCE_WINDOW_MS;

      // Nếu đang có tiền tố 2 âm tiết trong cửa sổ 900ms:
      if (hasRecentPrefix) {
        // Cho phép partial jitter rút gọn tạm thời ("hây li" -> "hây") mà không làm mất tiền tố
        if (normalized === "hey" || normalized === "hê" || normalized === "hây") {
          return false;
        }

        const isEnding =
          ONE_SYLLABLE_ENDS.has(normalized) ||
          TWO_SYLLABLE_ENDS.has(normalized) ||
          Array.from(ONE_SYLLABLE_ENDS).some((e) =>
            normalized.endsWith(` ${e}`),
          ) ||
          Array.from(TWO_SYLLABLE_ENDS).some((e) =>
            normalized.endsWith(` ${e}`),
          );

        if (isEnding) {
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
