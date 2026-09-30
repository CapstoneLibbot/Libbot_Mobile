import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

interface AppEmptyStateProps {
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function AppEmptyState({
  title,
  message,
  actionTitle,
  onAction,
}: AppEmptyStateProps): React.ReactElement {
  return (
    <View style={styles.emptyState}>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.subtext} style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionTitle && onAction ? (
        <View style={styles.actionContainer}>
          <AppButton title={actionTitle} onPress={onAction} variant="secondary" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 400,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
});
