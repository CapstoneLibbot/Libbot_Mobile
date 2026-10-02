import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";
import { AppText } from "./AppText";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  size?: "sm" | "md";
}

export function StatusBadge({
  label,
  tone = "neutral",
  size = "md",
}: StatusBadgeProps): React.ReactElement {
  const toneColors = {
    success: { background: colors.successSoft, text: colors.success },
    warning: { background: colors.warningSoft, text: colors.warning },
    danger: { background: colors.dangerSoft, text: colors.danger },
    neutral: { background: colors.surfaceAlt, text: colors.subtext },
    info: { background: colors.primarySoft, text: colors.primary },
  };

  const chosen = toneColors[tone];

  return (
    <View
      style={[
        styles.badge,
        size === "sm" ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: chosen.background },
      ]}
    >
      <AppText
        variant={size === "sm" ? "caption" : "body"}
        color={chosen.text}
        style={styles.text}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontWeight: "600",
  },
});
