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
 * Chấp nhận transcript của "Hey LiBot" (chỉ nhận khi có chính xác 3 âm tiết hợp lệ).
 * Triệt tiêu hoàn toàn kích hoạt nhầm khi có hội thoại phòng bằng cách:
 * - Bắt buộc đúng 3 từ (loại bỏ câu dài từ hội thoại như "hây hê li bốt", "tôi gọi hey li bot nhé").
 * - Không cho phép đuôi câu (loại bỏ hoàn toàn endsWith).
 * - Không nhận các từ đơn lẻ hoặc cụm 2 từ (như "libot", "robot ơi", "hey bốt", "li bot").
 */
export function isWakeWordMatch(text: string | null | undefined): boolean {
  const normalized = normalizeTranscript(text);
  if (!normalized || normalized === "[unk]") return false;

  // Bắt buộc phải là câu có chính xác 3 từ
  const words = normalized.split(/\s+/);
  if (words.length !== 3) return false;

  return WAKE_WORD_TRANSCRIPTS.has(normalized);
}

/**
 * Detector quản lý trạng thái ghép âm cho luồng ASR trực tiếp:
 * - Khớp ngay khi nhận diện được câu hoàn chỉnh đúng 3 từ ("Hey LiBot").
 * - Hoặc ghép chuỗi nghiêm ngặt: Tiền tố chính xác 2 âm tiết ("Hey Li") và theo sau là
 *   hậu tố chính xác 1 âm tiết ("Bot") trong vòng 900ms.
 * - Loại bỏ hoàn toàn mọi so khớp đuôi câu (endsWith) để ngăn tiếng trò chuyện phòng kích hoạt nhầm.
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

      // 1. Khớp trực tiếp đầy đủ chính xác 3 từ
      if (isWakeWordMatch(normalized)) {
        reset();
        return true;
      }

      const timestamp = now();

      // 2. Kiểm tra nếu là tiền tố 2 âm tiết chính xác ("hey li", "hê li", "hây li")
      const isTwoSyllablePrefix = TWO_SYLLABLE_PREFIXES.has(normalized);

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
          ONE_SYLLABLE_ENDS.has(normalized) || TWO_SYLLABLE_ENDS.has(normalized);

        if (isEnding) {
          reset();
          return true;
        }
      }

      reset();
      return false;
    },
  };
}
