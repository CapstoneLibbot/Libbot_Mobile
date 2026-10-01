import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
  numberOfLines = 1,
  style,
}: AppButtonProps): React.ReactElement {
  const isOutline = variant === "outline";

  const backgroundColor = disabled
    ? colors.border
    : isOutline
      ? "transparent"
      : variant === "secondary"
        ? colors.surfaceAlt
        : variant === "danger"
          ? colors.danger
          : variant === "success"
            ? colors.success
            : colors.primary;

  const textColor = disabled
    ? colors.disabled
    : isOutline
      ? colors.primary
      : variant === "secondary"
        ? colors.primary
        : colors.surface;

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        size === "lg" ? styles.sizeLg : styles.sizeMd,
        {
          backgroundColor,
          borderColor: isOutline ? colors.primary : "transparent",
          borderWidth: isOutline ? 1.5 : 0,
          opacity: pressed && !disabled && !loading ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <AppText
          variant={size === "lg" ? "subtitle" : "body"}
          color={textColor}
          numberOfLines={numberOfLines}
          style={styles.text}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sizeLg: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  sizeMd: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  text: {
    textAlign: "center",
    flexShrink: 1,
  },
});
