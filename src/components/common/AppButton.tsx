import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from './AppText';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function AppButton({ title, onPress, variant = 'primary', style }: AppButtonProps): React.ReactElement {
  const colorMap = {
    primary: colors.primary,
    secondary: colors.surfaceAlt,
    danger: colors.danger,
  };

  const textColor = variant === 'secondary' ? colors.primary : colors.surface;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: colorMap[variant] }, style]}
    >
      <AppText variant="subtitle" color={textColor}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

