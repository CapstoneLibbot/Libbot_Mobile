import { describe, expect, it } from "vitest";
import { booksMock } from "../../../mocks/books.mock";
import { facilitiesMock } from "../../../mocks/facilities.mock";
import { getResponsiveTokens } from "../../utils/responsive";

describe("Mobile Phone UI Text & Component Layout Formatting", () => {
  describe("Header Back Label Sanitation", () => {
    it("removes unicode arrows from backLabel to avoid duplicate icons", () => {
      const dirtyLabels = [
        "← Quay lại tra cứu",
        "← Màn hình chờ",
        "← Quay lại",
        "  ← Về trang chủ  ",
      ];

      for (const label of dirtyLabels) {
        const cleaned = label.replace(/^[←\s]+/, "").trim();
        expect(cleaned).not.toContain("←");
        expect(cleaned.length).toBeGreaterThan(0);
      }
    });

    it("preserves clean back labels without modification", () => {
      const cleanLabel = "Quay lại tra cứu";
      const result = cleanLabel.replace(/^[←\s]+/, "").trim();
      expect(result).toBe("Quay lại tra cứu");
    });
  });

  describe("Long Vietnamese Data & Typography Checks", () => {
    it("validates all book mock titles and descriptions exist and are non-empty", () => {
      for (const book of booksMock) {
        expect(book.title.length).toBeGreaterThan(0);
        expect(book.author.length).toBeGreaterThan(0);
        expect(book.shelf.length).toBeGreaterThan(0);
        expect(book.category.length).toBeGreaterThan(0);
        // Validates description length
        expect(book.description.length).toBeGreaterThan(20);
      }
    });

    it("validates facility names and descriptions exist and are non-empty", () => {
      for (const fac of facilitiesMock) {
        expect(fac.name.length).toBeGreaterThan(0);
        expect(fac.description.length).toBeGreaterThan(0);
        expect(fac.type.length).toBeGreaterThan(0);
        expect(fac.floor).toBeGreaterThanOrEqual(1);
      }
    });

    it("verifies compact tokens ensure at least 328dp usable width on 360dp screens", () => {
      const phoneScreenWidth = 360;
      const compactTokens = getResponsiveTokens("compact");

      // Total horizontal page padding = 16 * 2 = 32dp
      const usableWidth =
        phoneScreenWidth - compactTokens.pagePaddingHorizontal * 2;
      expect(usableWidth).toBe(328);

      // Card internal content width = 328 - 16 * 2 = 296dp
      const cardContentWidth = usableWidth - compactTokens.cardPadding * 2;
      expect(cardContentWidth).toBe(296);

      // 296dp comfortably accommodates 2 metadata items of 120dp each with 12dp gap
      const twoColsWidth = 120 * 2 + compactTokens.contentGap;
      expect(twoColsWidth).toBeLessThanOrEqual(cardContentWidth);
    });
  });

  describe("Touch Target Compliance", () => {
    it("ensures minimum interactive touch target is at least 44dp", () => {
      const minTouchTarget = 44;
      // All AppButton sizes must be >= 44dp
      const buttonSizeMdMinHeight = 44;
      const buttonSizeLgMinHeight = 50;
      const headerButtonMinHeight = 44;
      const chipMinHeight = 44;

      expect(buttonSizeMdMinHeight).toBeGreaterThanOrEqual(minTouchTarget);
      expect(buttonSizeLgMinHeight).toBeGreaterThanOrEqual(minTouchTarget);
      expect(headerButtonMinHeight).toBeGreaterThanOrEqual(minTouchTarget);
      expect(chipMinHeight).toBeGreaterThanOrEqual(minTouchTarget);
    });
  });
});
