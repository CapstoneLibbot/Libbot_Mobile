export type ResponsiveWidthClass = "compact" | "medium" | "expanded";

export interface ResponsiveLayoutTokens {
  pagePaddingHorizontal: number;
  cardPadding: number;
  contentGap: number;
}

export interface ResponsiveBreakpoint {
  isTablet: boolean;
  isCompact: boolean;
  isNarrowHeight: boolean;
  columnsCount: number;
  widthClass: ResponsiveWidthClass;
  isCompactWidth: boolean;
  isMediumWidth: boolean;
  isExpandedWidth: boolean;
  tokens: ResponsiveLayoutTokens;
}

export function getResponsiveTokens(
  widthClass: ResponsiveWidthClass,
): ResponsiveLayoutTokens {
  switch (widthClass) {
    case "compact":
      return {
        pagePaddingHorizontal: 16,
        cardPadding: 16,
        contentGap: 12,
      };
    case "medium":
      return {
        pagePaddingHorizontal: 20,
        cardPadding: 20,
        contentGap: 16,
      };
    case "expanded":
    default:
      return {
        pagePaddingHorizontal: 24,
        cardPadding: 24,
        contentGap: 24,
      };
  }
}

export function getResponsiveBreakpoint(
  width: number,
  height: number,
): ResponsiveBreakpoint {
  // In landscape kiosk: Tablet if width >= 900 and height >= 520
  const isTablet = width >= 900 && height >= 520;
  const isCompact = !isTablet;
  const isNarrowHeight = height < 500;
  const columnsCount = isTablet ? 2 : 1;

  // Responsive width class contract:
  // compact: < 600dp, medium: 600–839dp, expanded: >= 840dp
  const isCompactWidth = width < 600;
  const isMediumWidth = width >= 600 && width < 840;
  const isExpandedWidth = width >= 840;
  const widthClass: ResponsiveWidthClass = isExpandedWidth
    ? "expanded"
    : isMediumWidth
      ? "medium"
      : "compact";

  const tokens = getResponsiveTokens(widthClass);

  return {
    isTablet,
    isCompact,
    isNarrowHeight,
    columnsCount,
    widthClass,
    isCompactWidth,
    isMediumWidth,
    isExpandedWidth,
    tokens,
  };
}
