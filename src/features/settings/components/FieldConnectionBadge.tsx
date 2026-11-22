import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { colors, radius, spacing } from "@/shared/theme";
import { AppText } from "@/shared/ui";
import { FieldTestState } from "../types/settings.types";

export interface FieldConnectionBadgeProps {
  testState?: FieldTestState;
}

export function FieldConnectionBadge({
  testState,
}: FieldConnectionBadgeProps): React.ReactElement | null {
  if (!testState || testState.status === "idle") return null;

  const { status, message, testedAt } = testState;

  if (status === "testing") {
    return (
      <View style={[styles.badge, styles.testingBadge]}>
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
        <AppText variant="caption" color={colors.primary} style={styles.badgeText}>
          {message || "Đang kiểm tra kết nối..."}
        </AppText>
      </View>
    );
  }

  const isSuccess = status === "success";

  return (
    <View
      style={[
        styles.badge,
        isSuccess ? styles.successBadge : styles.errorBadge,
      ]}
    >
      {isSuccess ? (
        <CheckCircle2 size={16} color={colors.success} style={styles.icon} />
      ) : (
        <XCircle size={16} color={colors.danger} style={styles.icon} />
      )}
      <AppText
        variant="caption"
        color={isSuccess ? colors.success : colors.danger}
        style={styles.badgeText}
      >
        {message}
        {testedAt ? ` • ${testedAt}` : ""}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  testingBadge: {
    backgroundColor: "#F0F7FF",
  },
  successBadge: {
    backgroundColor: "#F0FDF4",
  },
  errorBadge: {
    backgroundColor: "#FEF2F2",
  },
  spinner: {
    marginRight: 6,
  },
  icon: {
    marginRight: 6,
  },
  badgeText: {
    fontWeight: "500",
    flexShrink: 1,
  },
});
