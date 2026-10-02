import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { colors, typography } from "../theme";

interface AppTextProps extends TextProps {
  children: React.ReactNode;
  variant?: "hero" | "title" | "heading" | "subtitle" | "body" | "caption";
  color?: string;
}

export function AppText({
  children,
  variant = "body",
  color = colors.text,
  style,
  ...props
}: AppTextProps): React.ReactElement {
  const variantStyles = {
    hero: typography.hero,
    title: typography.title,
    heading: typography.heading,
    subtitle: typography.subtitle,
    body: typography.body,
    caption: typography.caption,
  };

  return (
    <Text
      {...props}
      style={[styles.text, variantStyles[variant], { color }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "InterRegular",
  },
});
