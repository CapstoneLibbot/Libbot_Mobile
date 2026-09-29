import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from './AppText';

interface AppEmptyStateProps {
  title: string;
  message?: string;
}

export function AppEmptyState({ title, message }: AppEmptyStateProps): React.ReactElement {
  return (
    <View style={styles.emptyState}>
      <AppText variant="heading">{title}</AppText>
      {message ? <AppText color={colors.subtext} style={styles.message}>{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

