import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from './AppText';

interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps): React.ReactElement {
  const toneColors = {
    success: { background: colors.successSoft, text: colors.success },
    warning: { background: colors.warningSoft, text: colors.warning },
    danger: { background: colors.dangerSoft, text: colors.danger },
    neutral: { background: colors.primarySoft, text: colors.primary },
  };

  const chosen = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: chosen.background }]}>
      <AppText variant="caption" color={chosen.text}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});

