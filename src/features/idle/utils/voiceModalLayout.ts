import { spacing } from "@/shared/theme";

export interface VoiceModalDimensions {
  isCompact: boolean;
  isNarrowHeight: boolean;
  availableWidth: number;
  availableHeight: number;
  cardMaxWidth: number;
  cardMaxHeight: number;
  collapsedWidth: number;
  expandedWidth: number;
  panelWidth: number;
  panelGap: number;
}

export interface InsetsLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const DEFAULT_LIBOT_GREETING =
  "Xin chào! Thư viện mở cửa phục vụ từ 07:30 đến 21:00 các ngày trong tuần. Tôi có thể giúp bạn tìm sách hoặc khu vực.";

export function computeVoiceModalLayout(
  width: number,
  height: number,
  insets: InsetsLike,
): VoiceModalDimensions {
  const isCompact = width < 600;
  const isNarrowHeight = height < 500;

  const horizontalInset = insets.left + insets.right;
  const verticalInset = insets.top + insets.bottom;

  const availableWidth = Math.max(0, width - horizontalInset);
  const availableHeight = Math.max(0, height - verticalInset);

  if (isCompact) {
    // Compact screens (phones e.g. ~360dp) use a fluid single-panel dialog
    // with horizontal slide transition between Voice and Chat panels
    const modalWidth = Math.min(
      380,
      Math.max(280, availableWidth - spacing.md * 2),
    );
    const modalHeight = Math.min(
      isNarrowHeight ? 380 : 500,
      Math.max(300, availableHeight - spacing.md * 2),
    );

    return {
      isCompact: true,
      isNarrowHeight,
      availableWidth,
      availableHeight,
      cardMaxWidth: modalWidth,
      cardMaxHeight: modalHeight,
      collapsedWidth: modalWidth,
      expandedWidth: modalWidth,
      panelWidth: modalWidth,
      panelGap: 0,
    };
  }

  // Medium (600–839dp) and Expanded (>= 840dp) screens
  const panelGap = spacing.lg; // 16dp
  const maxContainerWidth = width >= 840 ? 960 : 760;

  const cardMaxWidth = Math.min(
    maxContainerWidth,
    availableWidth - spacing.xl * 2,
  );
  const cardMaxHeight = Math.min(
    isNarrowHeight ? 400 : 520,
    availableHeight - spacing.lg * 2,
  );

  // Collapsed width: centered single card (~440-480dp)
  const defaultCollapsed = width >= 840 ? 480 : 440;
  const collapsedWidth = Math.min(defaultCollapsed, cardMaxWidth);

  // Expanded width: two panels side by side
  const expandedWidth = cardMaxWidth;
  const panelWidth = Math.max(0, (expandedWidth - panelGap) / 2);

  return {
    isCompact: false,
    isNarrowHeight,
    availableWidth,
    availableHeight,
    cardMaxWidth,
    cardMaxHeight,
    collapsedWidth,
    expandedWidth,
    panelWidth,
    panelGap,
  };
}
