import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
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
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sizeMd: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {},
});
