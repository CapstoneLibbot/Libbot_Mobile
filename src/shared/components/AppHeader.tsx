import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

interface AppHeaderProps {
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
  const { insets, isCompact, isNarrowHeight } = useResponsiveLayout();

  const displayBackLabel = isCompact && backLabel.length > 12 ? "Quay lại" : backLabel;

  return (
    <View
      style={[
        styles.header,
        {
          paddingLeft: Math.max(insets.left, spacing.md),
          paddingRight: Math.max(insets.right, spacing.md),
          paddingVertical: isNarrowHeight ? spacing.xs + 2 : spacing.sm + 4,
          minHeight: isNarrowHeight ? 50 : 64,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={[
              styles.backButton,
              isNarrowHeight && styles.backButtonNarrow,
            ]}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <ArrowLeft color={colors.primary} size={18} strokeWidth={2.2} />
            <AppText
              variant="caption"
              color={colors.primary}
              numberOfLines={1}
              style={styles.backText}
            >
              {displayBackLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.centerContainer}>
        <AppText
          variant={isNarrowHeight ? "subtitle" : "heading"}
          style={styles.title}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            color={colors.subtext}
            numberOfLines={1}
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.rightContainer}>
        {rightActionLabel && onRightAction ? (
          <Pressable
            onPress={onRightAction}
            style={[
              styles.rightButton,
              isNarrowHeight && styles.rightButtonNarrow,
            ]}
            accessibilityRole="button"
            accessibilityLabel={rightActionLabel}
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
  },
  leftContainer: {
    flexShrink: 0,
    alignItems: "flex-start",
    maxWidth: "30%",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  rightContainer: {
    flexShrink: 0,
    alignItems: "flex-end",
    maxWidth: "30%",
  },
  backButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
  },
  backButtonNarrow: {
    minHeight: 34,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
  },
  backText: {
    fontFamily: "InterSemiBold",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  rightButton: {
    minHeight: 40,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
  },
  rightButtonNarrow: {
    minHeight: 34,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
  },
  rightActionText: {
    fontFamily: "InterSemiBold",
  },
});
