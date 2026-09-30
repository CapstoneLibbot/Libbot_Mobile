import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

interface AppCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppCard({ children, style }: AppCardProps): React.ReactElement {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
});
