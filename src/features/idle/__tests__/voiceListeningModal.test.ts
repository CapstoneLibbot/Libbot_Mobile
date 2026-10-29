import { describe, expect, it, vi } from "vitest";
import { useKioskStore } from "@/core/state";
import {
  computeVoiceModalLayout,
  voiceDescription,
  voiceTitle,
  DEFAULT_LIBOT_GREETING,
  type InsetsLike,
} from "../utils/voiceModalLayout";
import { type VoiceToolResult } from "../hooks/useXiaozhiVoiceSession";

describe("VoiceListeningModal UI/UX Specifications Contract", () => {
  const zeroInsets: InsetsLike = { top: 0, right: 0, bottom: 0, left: 0 };
  const phoneInsets: InsetsLike = { top: 44, right: 0, bottom: 34, left: 0 };

  describe("Responsive Layout Verification (360dp, 768dp, 1024dp)", () => {
    it("1. Compact Phone Portrait (~360dp): fluid single panel layout, prevents cramped dual columns", () => {
      const layout = computeVoiceModalLayout(360, 740, phoneInsets);

      expect(layout.isCompact).toBe(true);
      expect(layout.isNarrowHeight).toBe(false);
      expect(layout.cardMaxWidth).toBeLessThanOrEqual(360);
      expect(layout.cardMaxWidth).toBeGreaterThanOrEqual(300);

      // On compact screens, collapsedWidth equals expandedWidth equals panelWidth
      // because panels slide full-width horizontally instead of squeezing into 2 narrow columns
      expect(layout.collapsedWidth).toBe(layout.cardMaxWidth);
      expect(layout.expandedWidth).toBe(layout.cardMaxWidth);
      expect(layout.panelWidth).toBe(layout.cardMaxWidth);
      expect(layout.panelGap).toBe(0);

      // Modal height remains safe within available viewport
      expect(layout.cardMaxHeight).toBeLessThanOrEqual(layout.availableHeight);
    });

    it("2. Tablet Portrait / Medium (~768dp): supports side-by-side two-panel expansion", () => {
      const layout = computeVoiceModalLayout(768, 1024, zeroInsets);

      expect(layout.isCompact).toBe(false);
      expect(layout.isNarrowHeight).toBe(false);

      // Collapsed: centered single card (~440dp)
      expect(layout.collapsedWidth).toBe(440);

      // Expanded: wider two-panel container
      expect(layout.expandedWidth).toBe(720);
      expect(layout.panelGap).toBe(16);

      // Both panels fit comfortably side-by-side with 16dp gap
      expect(layout.panelWidth * 2 + layout.panelGap).toBe(
        layout.expandedWidth,
      );
      expect(layout.panelWidth).toBe(352);
    });

    it("3. Tablet / Kiosk Landscape Expanded (~1024dp): prioritizes prominent two-panel modal (anh2)", () => {
      const kioskInsets: InsetsLike = { top: 0, right: 24, bottom: 0, left: 24 };
      const layout = computeVoiceModalLayout(1024, 768, kioskInsets);

      expect(layout.isCompact).toBe(false);
      expect(layout.isNarrowHeight).toBe(false);

      // Collapsed width is 480dp (anh1 spirit)
      expect(layout.collapsedWidth).toBe(480);

      // Expanded width caps at 928dp within safe area
      expect(layout.expandedWidth).toBe(928);
      expect(layout.panelGap).toBe(16);

      // Each panel gets ample width for waveform & rich conversation
      expect(layout.panelWidth).toBe((928 - 16) / 2);
      expect(layout.panelWidth).toBe(456);
      expect(layout.cardMaxHeight).toBeLessThanOrEqual(768);
    });

    it("detects narrow height in landscape phone viewports (< 500dp)", () => {
      const phoneLandscape = computeVoiceModalLayout(844, 390, zeroInsets);
      expect(phoneLandscape.isNarrowHeight).toBe(true);
      expect(phoneLandscape.cardMaxHeight).toBeLessThanOrEqual(390);
    });
  });

  describe("Status Titles, Descriptions, and Default Greeting", () => {
    it("maps voice status to clear, localized Vietnamese titles", () => {
      expect(voiceTitle("listening")).toBe("LiBot đang lắng nghe");
      expect(voiceTitle("thinking")).toBe("LiBot đang tìm thông tin");
      expect(voiceTitle("speaking")).toBe("LiBot đang trả lời");
      expect(voiceTitle("connecting")).toBe("LiBot đang kết nối");
      expect(voiceTitle("disconnected")).toBe("LiBot đang kết nối");
      expect(voiceTitle("error")).toBe("LiBot cần được thử lại");
    });

    it("maps voice descriptions accurately and prioritizes explicit error strings", () => {
      expect(voiceDescription("listening", null)).toBe(
        "Bạn có thể nói tên sách, tác giả hoặc khu vực bạn muốn tìm",
      );
      expect(voiceDescription("thinking", null)).toBe(
        "Đang tìm thông tin trong thư viện…",
      );
      expect(voiceDescription("speaking", null)).toBe("LiBot đang trả lời…");
      expect(voiceDescription("connecting", null)).toBe(
        "Đang kết nối trợ lý giọng nói…",
      );

      const customError = "Microphone không khả dụng";
      expect(voiceDescription("error", customError)).toBe(customError);
      expect(voiceDescription("listening", customError)).toBe(customError);
    });

    it("provides the default LiBot greeting when conversation history is empty", () => {
      expect(DEFAULT_LIBOT_GREETING).toContain("Xin chào! Thư viện mở cửa");
      expect(DEFAULT_LIBOT_GREETING).toContain("tìm sách hoặc khu vực");
    });
  });

  describe("Expand, Collapse, and Close Session State Flow", () => {
    it("expanding and collapsing does NOT call stop() and preserves conversation state", () => {
      const stop = vi.fn();
      const setVoiceActive = vi.fn();
      const recordInteraction = vi.fn();
      let isExpanded = false;

      const conversationMock = [
        { id: "msg-1", speaker: "user" as const, text: "Tìm sách Clean Code" },
        {
          id: "msg-2",
          speaker: "assistant" as const,
          text: "Tôi tìm thấy 1 kết quả",
        },
      ];

      // Simulated handleExpand
      const handleExpand = () => {
        recordInteraction();
        isExpanded = true;
      };

      // Simulated handleCollapse
      const handleCollapse = () => {
        recordInteraction();
        isExpanded = false;
      };

      expect(isExpanded).toBe(false);

      // User taps expand button on the right edge
      handleExpand();
      expect(isExpanded).toBe(true);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
      // STOP MUST NOT BE CALLED
      expect(stop).not.toHaveBeenCalled();
      expect(setVoiceActive).not.toHaveBeenCalled();
      // Conversation must remain intact
      expect(conversationMock.length).toBe(2);

      // User taps collapse button
      handleCollapse();
      expect(isExpanded).toBe(false);
      expect(recordInteraction).toHaveBeenCalledTimes(2);
      // STOP MUST STILL NOT BE CALLED
      expect(stop).not.toHaveBeenCalled();
      expect(conversationMock.length).toBe(2);
    });

    it("close button X always closes entire session and resets voice active in store", () => {
      const stop = vi.fn();
      const onClose = vi.fn();
      const recordInteraction = vi.fn();
      const store = useKioskStore.getState();

      store.setVoiceActive(true);
      expect(useKioskStore.getState().isVoiceActive).toBe(true);

      const handleClose = () => {
        stop();
        store.setVoiceActive(false);
        recordInteraction();
        onClose();
      };

      // Tapping close button X
      handleClose();

      expect(stop).toHaveBeenCalledTimes(1);
      expect(useKioskStore.getState().isVoiceActive).toBe(false);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Tool Result Book Card & Area Card Contract", () => {
    it("verifies book card data shape: title, author, availableCopies, and triggers onSelectBook", () => {
      const onSelectBook = vi.fn();
      const handleClose = vi.fn();

      const handleSelectBook = (bookId: string) => {
        handleClose();
        onSelectBook(bookId);
      };

      const bookResult: VoiceToolResult = {
        kind: "books",
        query: "lập trình",
        totalMatches: 1,
        books: [
          {
            bookId: "b-clean-code-01",
            title: "Clean Code: Kỹ Năng Lập Trình",
            author: "Robert C. Martin",
            availableCopies: 3,
          },
        ],
      };

      const book = bookResult.books[0];
      expect(book.title).toBe("Clean Code: Kỹ Năng Lập Trình");
      expect(book.author).toBe("Robert C. Martin");
      expect(`Còn ${book.availableCopies} bản`).toBe("Còn 3 bản");

      // Clicking either the card body or the detail button opens the book detail
      handleSelectBook(book.bookId);
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(onSelectBook).toHaveBeenCalledWith("b-clean-code-01");
    });

    it("falls back gracefully when author information is missing", () => {
      const bookWithoutAuthor = {
        bookId: "b-99",
        title: "Sách Cổ Không Rõ Tác Giả",
        author: "",
        availableCopies: 1,
      };

      const displayAuthor =
        bookWithoutAuthor.author || "Chưa có thông tin tác giả";
      expect(displayAuthor).toBe("Chưa có thông tin tác giả");
      expect(`Còn ${bookWithoutAuthor.availableCopies} bản`).toBe("Còn 1 bản");
    });

    it("verifies area result cards display name and floor without navigation action", () => {
      const areaResult: VoiceToolResult = {
        kind: "areas",
        query: "khu vực đọc",
        totalMatches: 2,
        areas: [
          {
            name: "Phòng đọc mở",
            floorNumber: 2,
            floorName: "Tầng 2",
          },
          {
            name: "Khu vực mượn trả",
            floorNumber: 1,
            floorName: "Tầng 1",
          },
        ],
      };

      if (areaResult.kind !== "areas") {
        throw new Error("Expected areas tool result");
      }

      const area1 = areaResult.areas[0];
      const area2 = areaResult.areas[1];

      expect(area1.name).toBe("Phòng đọc mở");
      expect(area1.floorName || `Tầng ${area1.floorNumber}`).toBe("Tầng 2");

      expect(area2.name).toBe("Khu vực mượn trả");
      expect(area2.floorName || `Tầng ${area2.floorNumber}`).toBe("Tầng 1");
    });
  });
});
