import { describe, expect, it } from "vitest";
import { getResponsiveBreakpoint, getResponsiveTokens } from "../responsive";

describe("Responsive Layout Utilities and Width Class Contract", () => {
  describe("Width Class Breakpoints", () => {
    it("classifies viewport width < 600dp as compact", () => {
      // Compact phone portrait (e.g. 360dp, 375dp, 390dp, 412dp)
      const phone360 = getResponsiveBreakpoint(360, 800);
      expect(phone360.widthClass).toBe("compact");
      expect(phone360.isCompactWidth).toBe(true);
      expect(phone360.isMediumWidth).toBe(false);
      expect(phone360.isExpandedWidth).toBe(false);

      const phoneSE = getResponsiveBreakpoint(375, 667);
      expect(phoneSE.widthClass).toBe("compact");
      expect(phoneSE.isCompactWidth).toBe(true);

      const boundaryCompact = getResponsiveBreakpoint(599, 900);
      expect(boundaryCompact.widthClass).toBe("compact");
      expect(boundaryCompact.isCompactWidth).toBe(true);
    });

    it("classifies viewport width 600–839dp as medium", () => {
      // Tablet portrait or small foldable
      const boundaryMediumStart = getResponsiveBreakpoint(600, 900);
      expect(boundaryMediumStart.widthClass).toBe("medium");
      expect(boundaryMediumStart.isMediumWidth).toBe(true);
      expect(boundaryMediumStart.isCompactWidth).toBe(false);
      expect(boundaryMediumStart.isExpandedWidth).toBe(false);

      const ipadPortrait = getResponsiveBreakpoint(768, 1024);
      expect(ipadPortrait.widthClass).toBe("medium");
      expect(ipadPortrait.isMediumWidth).toBe(true);

      const boundaryMediumEnd = getResponsiveBreakpoint(839, 900);
      expect(boundaryMediumEnd.widthClass).toBe("medium");
      expect(boundaryMediumEnd.isMediumWidth).toBe(true);
    });

    it("classifies viewport width >= 840dp as expanded", () => {
      const boundaryExpanded = getResponsiveBreakpoint(840, 600);
      expect(boundaryExpanded.widthClass).toBe("expanded");
      expect(boundaryExpanded.isExpandedWidth).toBe(true);
      expect(boundaryExpanded.isMediumWidth).toBe(false);
      expect(boundaryExpanded.isCompactWidth).toBe(false);

      // Tablet landscape (e.g. iPad 1024x768, 1180x820)
      const ipadLandscape = getResponsiveBreakpoint(1024, 768);
      expect(ipadLandscape.widthClass).toBe("expanded");
      expect(ipadLandscape.isExpandedWidth).toBe(true);

      const largeScreen = getResponsiveBreakpoint(1280, 800);
      expect(largeScreen.widthClass).toBe("expanded");
      expect(largeScreen.isExpandedWidth).toBe(true);
    });
  });

  describe("Responsive Layout Tokens Scale", () => {
    it("provides compact tokens with reduced padding to avoid 360dp overflow", () => {
      const tokens = getResponsiveTokens("compact");
      expect(tokens.pagePaddingHorizontal).toBe(16);
      expect(tokens.cardPadding).toBe(16);
      expect(tokens.contentGap).toBe(12);
    });

    it("provides medium tokens for balanced tablet portrait spacing", () => {
      const tokens = getResponsiveTokens("medium");
      expect(tokens.pagePaddingHorizontal).toBe(20);
      expect(tokens.cardPadding).toBe(20);
      expect(tokens.contentGap).toBe(16);
    });

    it("provides expanded tokens matching full kiosk tablet experience", () => {
      const tokens = getResponsiveTokens("expanded");
      expect(tokens.pagePaddingHorizontal).toBe(24);
      expect(tokens.cardPadding).toBe(24);
      expect(tokens.contentGap).toBe(24);
    });

    it("attaches correct tokens to the breakpoint object", () => {
      const bpCompact = getResponsiveBreakpoint(360, 640);
      expect(bpCompact.tokens).toEqual(getResponsiveTokens("compact"));

      const bpExpanded = getResponsiveBreakpoint(1024, 768);
      expect(bpExpanded.tokens).toEqual(getResponsiveTokens("expanded"));
    });
  });

  describe("Orientation and Resize Stability", () => {
    it("preserves breakpoint semantics across orientation change simulation", () => {
      // Phone portrait 390x844 -> Phone landscape 844x390
      const portrait = getResponsiveBreakpoint(390, 844);
      expect(portrait.widthClass).toBe("compact");
      expect(portrait.isNarrowHeight).toBe(false);

      const landscape = getResponsiveBreakpoint(844, 390);
      // Landscape width >= 840 is expanded width class, but narrow height < 500
      expect(landscape.widthClass).toBe("expanded");
      expect(landscape.isNarrowHeight).toBe(true);
      // Tablet kiosk requires width >= 900 AND height >= 520, so a landscape phone is not a tablet kiosk
      expect(landscape.isTablet).toBe(false);
    });

    it("correctly detects tablet landscape kiosk requirement (width >= 900 and height >= 520)", () => {
      const tabletKiosk = getResponsiveBreakpoint(1024, 768);
      expect(tabletKiosk.isTablet).toBe(true);
      expect(tabletKiosk.columnsCount).toBe(2);

      const smallTablet = getResponsiveBreakpoint(768, 600);
      expect(smallTablet.isTablet).toBe(false);
      expect(smallTablet.columnsCount).toBe(1);
    });
  });
});
