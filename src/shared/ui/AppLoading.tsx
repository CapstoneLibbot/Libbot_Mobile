import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";
import { AppText } from "./AppText";

interface AppLoadingProps {
  message?: string;
}

export function AppLoading({
  message = "Đang tải dữ liệu...",
}: AppLoadingProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText
        variant="subtitle"
        color={colors.textSecondary}
        style={styles.label}
      >
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  label: {
    marginTop: spacing.md,
  },
});
