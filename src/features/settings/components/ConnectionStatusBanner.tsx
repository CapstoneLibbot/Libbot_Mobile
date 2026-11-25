import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { colors, radius, spacing } from "@/shared/theme";
import { AppCard, AppText } from "@/shared/ui";
import { ConnectionTestResult } from "../types/settings.types";

export interface ConnectionStatusBannerProps {
  testResult: ConnectionTestResult | null;
}

export function ConnectionStatusBanner({
  testResult,
}: ConnectionStatusBannerProps): React.ReactElement | null {
  if (!testResult) return null;

  const { isTesting, success, message, testedAt } = testResult;

  if (isTesting) {
    return (
      <AppCard style={[styles.card, styles.testingCard]}>
        <ActivityIndicator size="small" color={colors.primary} style={styles.indicator} />
        <View style={styles.textContainer}>
          <AppText variant="body" color={colors.primary}>
            {message}
          </AppText>
        </View>
      </AppCard>
    );
  }

  const isSuccess = success === true;

  return (
    <AppCard
      style={[
        styles.card,
        isSuccess ? styles.successCard : styles.errorCard,
      ]}
    >
      <View style={styles.iconContainer}>
        {isSuccess ? (
          <CheckCircle2 size={22} color={colors.success} />
        ) : (
          <XCircle size={22} color={colors.danger} />
        )}
      </View>
      <View style={styles.textContainer}>
        <AppText
          variant="body"
          color={isSuccess ? colors.success : colors.danger}
        >
          {message}
        </AppText>
        {testedAt ? (
          <AppText variant="caption" color={colors.textSecondary} style={styles.timeText}>
            Lần kiểm tra gần nhất: {testedAt}
          </AppText>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  testingCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  successCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  indicator: {
    marginRight: spacing.sm,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  timeText: {
    marginTop: 2,
  },
});
