import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightActionLabel?: string;
  onRightAction?: () => void;
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Quay lại",
  rightActionLabel,
  onRightAction,
}: AppHeaderProps): React.ReactElement {
  const { insets, isNarrowHeight, isCompactWidth } = useResponsiveLayout();

  // Strip leading unicode arrows if callers passed them (e.g. "← Quay lại")
  const cleanBackLabel = backLabel.replace(/^[←\s]+/, "") || "Quay lại";

  return (
    <View
      style={[
        styles.header,
        {
          paddingLeft: Math.max(insets.left, spacing.md),
          paddingRight: Math.max(insets.right, spacing.md),
          paddingVertical: isNarrowHeight ? spacing.xs : spacing.sm,
          minHeight: isNarrowHeight ? 50 : isCompactWidth ? 56 : 64,
        },
      ]}
    >
      {/* Left Back action */}
      <View style={styles.leftContainer}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={[
              styles.backButton,
              isCompactWidth && styles.backButtonCompact,
              isNarrowHeight && styles.backButtonNarrow,
            ]}
            accessibilityRole="button"
            accessibilityLabel={cleanBackLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft
              color={colors.primary}
              size={isCompactWidth ? 22 : 18}
              strokeWidth={2.2}
            />
            {!isCompactWidth && (
              <AppText
                variant="caption"
                color={colors.primary}
                numberOfLines={1}
                style={styles.backText}
              >
                {cleanBackLabel}
              </AppText>
            )}
          </Pressable>
        ) : null}
      </View>

      {/* Center / Primary Title Section */}
      <View
        style={[
          styles.centerContainer,
          isCompactWidth && styles.centerContainerCompact,
        ]}
      >
        <AppText
          variant={isNarrowHeight || isCompactWidth ? "subtitle" : "heading"}
          style={[styles.title, isCompactWidth && styles.titleCompact]}
          numberOfLines={2}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            color={colors.subtext}
            numberOfLines={1}
            style={[styles.subtitle, isCompactWidth && styles.subtitleCompact]}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {/* Right Action */}
      <View style={styles.rightContainer}>
        {rightActionLabel && onRightAction ? (
          <Pressable
            onPress={onRightAction}
            style={[
              styles.rightButton,
              isCompactWidth && styles.rightButtonCompact,
              isNarrowHeight && styles.rightButtonNarrow,
            ]}
            accessibilityRole="button"
            accessibilityLabel={rightActionLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="caption"
              color={colors.primaryDark}
              numberOfLines={1}
              style={styles.rightActionText}
            >
              {rightActionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  leftContainer: {
    flexShrink: 0,
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainerCompact: {
    alignItems: "flex-start",
  },
  rightContainer: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
  },
  backButtonCompact: {
    paddingHorizontal: 0,
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  backButtonNarrow: {
    minHeight: 40,
    height: 40,
    paddingVertical: 2,
  },
  backText: {
    fontFamily: "InterSemiBold",
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
  },
  titleCompact: {
    textAlign: "left",
    lineHeight: 20,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 2,
  },
  subtitleCompact: {
    textAlign: "left",
    marginTop: 1,
  },
  rightButton: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  rightButtonCompact: {
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  rightButtonNarrow: {
    minHeight: 40,
    paddingVertical: 2,
  },
  rightActionText: {
    fontFamily: "InterSemiBold",
  },
});
