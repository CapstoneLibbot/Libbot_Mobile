import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from './AppText';

interface AppHeaderProps {
  title: string;
  rightAction?: string;
  onRightAction?: () => void;
}

export function AppHeader({ title, rightAction, onRightAction }: AppHeaderProps): React.ReactElement {
  return (
    <View style={styles.header}>
      <AppText variant="heading">{title}</AppText>
      {rightAction ? (
        <Pressable onPress={onRightAction} style={styles.action}>
          <AppText variant="caption" color={colors.primary}>{rightAction}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  action: {
    paddingVertical: spacing.xs,
  },
});

