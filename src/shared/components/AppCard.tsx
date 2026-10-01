import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, radius, shadows, spacing } from "../theme";

export interface AppCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: "compact" | "normal" | "none";
}

export function AppCard({
  children,
  style,
  padding,
}: AppCardProps): React.ReactElement {
  const { tokens, isCompactWidth } = useResponsiveLayout();

  const resolvePadding = () => {
    if (padding === "none") return 0;
    if (padding === "compact") return spacing.md;
    if (padding === "normal") return spacing.xl;
    return isCompactWidth ? tokens.cardPadding : spacing.xl;
  };

  return (
    <View style={[styles.card, { padding: resolvePadding() }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
});
