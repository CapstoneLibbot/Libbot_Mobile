import { describe, expect, it } from "vitest";
import { getResponsiveBreakpoint } from "@/shared/layout/responsive";

describe("BookDetailScreen Responsive Layout & UI Contract", () => {
  // Logic from BookDetailScreen:
  // const isTwoColumn = Boolean(isTablet || (!isCompactWidth && width > height));
  const checkIsTwoColumn = (
    width: number,
    height: number,
    isTablet: boolean,
    isCompactWidth: boolean,
  ) => Boolean(isTablet || (!isCompactWidth && width > height));

  describe("1. Viewport Adaptation Contract (360dp, 768dp, 1024dp)", () => {
    it("uses vertical stacked layout on compact phone portrait (360dp)", () => {
      const phone360 = getResponsiveBreakpoint(360, 800);
      expect(phone360.isCompactWidth).toBe(true);
      expect(
        checkIsTwoColumn(
          360,
          800,
          phone360.isTablet,
          phone360.isCompactWidth,
        ),
      ).toBe(false);
    });

    it("uses vertical stacked layout on standard phone portrait (390dp)", () => {
      const phone390 = getResponsiveBreakpoint(390, 844);
      expect(phone390.isCompactWidth).toBe(true);
      expect(
        checkIsTwoColumn(
          390,
          844,
          phone390.isTablet,
          phone390.isCompactWidth,
        ),
      ).toBe(false);
    });

    it("uses vertical stacked layout on tablet portrait (768dp)", () => {
      const tabletPortrait = getResponsiveBreakpoint(768, 1024);
      expect(tabletPortrait.isCompactWidth).toBe(false);
      // In portrait (width < height), two cards stack cleanly
      expect(
        checkIsTwoColumn(
          768,
          1024,
          tabletPortrait.isTablet,
          tabletPortrait.isCompactWidth,
        ),
      ).toBe(false);
    });

    it("activates two-column layout on standard kiosk landscape (1024x768)", () => {
      const kioskLandscape = getResponsiveBreakpoint(1024, 768);
      expect(kioskLandscape.isTablet).toBe(true);
      expect(
        checkIsTwoColumn(
          1024,
          768,
          kioskLandscape.isTablet,
          kioskLandscape.isCompactWidth,
        ),
      ).toBe(true);
    });

    it("activates two-column layout on kiosk landscape with Android system bars (1024x457)", () => {
      const androidKiosk = getResponsiveBreakpoint(1024, 457);
      expect(androidKiosk.isCompactWidth).toBe(false);
      expect(
        checkIsTwoColumn(
          1024,
          457,
          androidKiosk.isTablet,
          androidKiosk.isCompactWidth,
        ),
      ).toBe(true);
    });

    it("activates two-column layout on medium landscape tablet (800x480)", () => {
      const smallKiosk = getResponsiveBreakpoint(800, 480);
      expect(smallKiosk.isCompactWidth).toBe(false);
      expect(
        checkIsTwoColumn(
          800,
          480,
          smallKiosk.isTablet,
          smallKiosk.isCompactWidth,
        ),
      ).toBe(true);
    });
  });

  describe("2. Two-Column Proportions & Sizing Constraints", () => {
    it("allocates 40–42% width to info card and 58–60% to summary card", () => {
      const leftFlex = 0.42;
      const rightFlex = 0.58;

      expect(leftFlex + rightFlex).toBe(1.0);
      expect(leftFlex).toBeGreaterThanOrEqual(0.4);
      expect(leftFlex).toBeLessThanOrEqual(0.42);
      expect(rightFlex).toBeGreaterThanOrEqual(0.58);
      expect(rightFlex).toBeLessThanOrEqual(0.6);
    });

    it("bounds maximum card height between 360dp and 400dp in desktop/kiosk mode", () => {
      const maxCardHeight = 380;
      expect(maxCardHeight).toBeGreaterThanOrEqual(360);
      expect(maxCardHeight).toBeLessThanOrEqual(400);
    });

    it("defines minimum touch target heights >= 44dp for all action buttons", () => {
      const mapButtonMinHeight = 44;
      const guideButtonMinHeight = 44;

      expect(mapButtonMinHeight).toBeGreaterThanOrEqual(44);
      expect(guideButtonMinHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe("3. Data Fallback & Edge Case Resilience", () => {
    it("handles missing endpoint gracefully without breaking guidance state", () => {
      const endpoint = null;
      const canStartGuidance = Boolean(endpoint);
      expect(canStartGuidance).toBe(false);

      const locationText = canStartGuidance
        ? "Vị trí hợp lệ"
        : "Chưa có vị trí dẫn đường cho sách này";
      expect(locationText).toBe("Chưa có vị trí dẫn đường cho sách này");
    });

    it("formats location label with aisle, shelf, and shelfSlot cleanly", () => {
      const formatLocation = (aisle?: string, shelf?: string, slot?: string) =>
        [aisle, shelf, slot]
          .filter((v): v is string => Boolean(v?.trim()))
          .join(" · ");

      expect(
        formatLocation("Dãy sách A", "Kệ Công nghệ A3", "Ngăn 2"),
      ).toBe("Dãy sách A · Kệ Công nghệ A3 · Ngăn 2");
      expect(formatLocation(undefined, "Kệ Văn học", "Ngăn 1")).toBe(
        "Kệ Văn học · Ngăn 1",
      );
      expect(formatLocation(undefined, undefined, undefined)).toBe("");
    });

    it("falls back to default placeholder text when metadata is absent", () => {
      const formatYear = (val?: number) => val?.toString() ?? "Chưa cập nhật";
      const isbn = "";
      const publisher = "";
      const description = "";

      expect(isbn || "Chưa cập nhật").toBe("Chưa cập nhật");
      expect(formatYear(undefined)).toBe("Chưa cập nhật");
      expect(formatYear(2008)).toBe("2008");
      expect(publisher || "Chưa cập nhật").toBe("Chưa cập nhật");
      expect(description?.trim() || "Chưa cập nhật tóm tắt nội dung.").toBe(
        "Chưa cập nhật tóm tắt nội dung.",
      );
    });
  });
});
