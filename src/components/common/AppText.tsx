import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { colors, typography } from '../../theme';

interface AppTextProps extends TextProps {
  children: React.ReactNode;
  variant?: 'body' | 'subtitle' | 'heading' | 'title' | 'caption';
  color?: string;
}

export function AppText({ children, variant = 'body', color = colors.text, style, ...props }: AppTextProps): React.ReactElement {
  const variantStyles = {
    body: typography.body,
    subtitle: typography.subtitle,
    heading: typography.heading,
    title: typography.title,
    caption: typography.caption,
  };

  return (
    <Text {...props} style={[styles.text, variantStyles[variant], { color }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'System',
  },
});

