import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from '../common';

interface RobotStatusBadgeProps {
  label: string;
  online?: boolean;
}

export function RobotStatusBadge({ label, online = true }: RobotStatusBadgeProps): React.ReactElement {
  return (
    <View style={[styles.badge, { backgroundColor: online ? colors.successSoft : colors.dangerSoft }]}>
      <AppText variant="caption" color={online ? colors.success : colors.danger}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
});

