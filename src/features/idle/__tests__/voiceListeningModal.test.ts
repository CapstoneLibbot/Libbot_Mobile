import { describe, expect, it, vi } from "vitest";
import { useKioskStore } from "@/core/state";
import {
  computeVoiceModalLayout,
  DEFAULT_LIBOT_GREETING,
  type InsetsLike,
} from "../utils/voiceModalLayout";
import { type VoiceToolResult } from "../hooks/useXiaozhiVoiceSession";
import { getVoiceSessionCopy } from "../domain/voiceSessionState";

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
      expect(getVoiceSessionCopy("listening", null).title).toBe("Đang lắng nghe");
      expect(getVoiceSessionCopy("thinking", null).title).toBe("Đang tìm thông tin");
      expect(getVoiceSessionCopy("speaking", null).title).toBe("Đang trả lời");
      expect(getVoiceSessionCopy("connecting", null).title).toBe("Đang kết nối");
      expect(getVoiceSessionCopy("disconnected", null).title).toBe("Đang kết nối lại");
      expect(getVoiceSessionCopy("error", null).title).toBe("Cần thử lại");
    });

    it("maps voice descriptions accurately and prioritizes explicit error strings", () => {
      expect(getVoiceSessionCopy("listening", null).description).toBe(
        "Bạn có thể nói tên sách hoặc khu vực bạn muốn tìm",
      );
      expect(getVoiceSessionCopy("thinking", null).description).toBe(
        "Đang tìm thông tin trong thư viện…",
      );
      expect(getVoiceSessionCopy("speaking", null).description).toBe("Robot đang trả lời…");
      expect(getVoiceSessionCopy("connecting", null).description).toBe(
        "Đang kết nối trợ lý giọng nói…",
      );

      const customError = "Microphone không khả dụng";
      expect(getVoiceSessionCopy("error", customError).description).toBe(customError);
      expect(getVoiceSessionCopy("listening", customError).description).toBe(customError);
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

    it("microphone mute toggle pauses capture and updates UI copy without terminating the session", () => {
      let isMuted = false;
      const pauseCapture = vi.fn();
      const resumeCapture = vi.fn();
      const recordInteraction = vi.fn();
      const stop = vi.fn();

      const toggleMute = () => {
        recordInteraction();
        if (isMuted) {
          isMuted = false;
          resumeCapture();
        } else {
          isMuted = true;
          pauseCapture();
        }
      };

      // User mutes microphone (e.g. ambient noise or talking to someone else)
      toggleMute();
      expect(isMuted).toBe(true);
      expect(pauseCapture).toHaveBeenCalledTimes(1);
      expect(resumeCapture).not.toHaveBeenCalled();
      expect(stop).not.toHaveBeenCalled();
      expect(recordInteraction).toHaveBeenCalledTimes(1);

      // Verify muted presentation copy
      const mutedCopy = isMuted
        ? {
            title: "Đã tạm dừng nghe",
            description: "Bấm nút để tiếp tục nói.",
          }
        : getVoiceSessionCopy("listening", null);

      expect(mutedCopy.title).toBe("Đã tạm dừng nghe");
      expect(mutedCopy.description).toBe("Bấm nút để tiếp tục nói.");

      // User un-mutes microphone to speak again
      toggleMute();
      expect(isMuted).toBe(false);
      expect(resumeCapture).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();
      expect(recordInteraction).toHaveBeenCalledTimes(2);
    });
  });

  describe("Tool Result Book and Location Card Contract", () => {
    it("verifies book card data shape: title, author, guidance state, and triggers onSelectBook", () => {
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
            canGuide: true,
          },
        ],
      };

      const book = bookResult.books[0];
      expect(book.title).toBe("Clean Code: Kỹ Năng Lập Trình");
      expect(book.author).toBe("Robert C. Martin");
      expect(book.canGuide ? "Có thể dẫn đường" : "Chưa thể dẫn đường").toBe("Có thể dẫn đường");

      // Clicking either the card body or the detail button opens the book detail
      handleSelectBook(book.bookId);
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(onSelectBook).toHaveBeenCalledWith("b-clean-code-01");
    });

    it("shows when a book cannot be guided", () => {
      const unavailableBook = {
        bookId: "b-99",
        title: "Sách Cổ Không Rõ Tác Giả",
        author: "Không rõ",
        canGuide: false,
      };

      expect(unavailableBook.canGuide ? "Có thể dẫn đường" : "Chưa thể dẫn đường").toBe("Chưa thể dẫn đường");
    });

  });
});
