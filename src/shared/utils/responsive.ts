export interface ResponsiveBreakpoint {
  isTablet: boolean;
  isCompact: boolean;
  isNarrowHeight: boolean;
  columnsCount: number;
}

export function getResponsiveBreakpoint(
  width: number,
  height: number
): ResponsiveBreakpoint {
  // In landscape kiosk: Tablet if width >= 900 and height >= 520
  const isTablet = width >= 900 && height >= 520;
  const isCompact = !isTablet;
  const isNarrowHeight = height < 500;
  const columnsCount = isTablet ? 2 : 1;

  return {
    isTablet,
    isCompact,
    isNarrowHeight,
    columnsCount,
  };
}
