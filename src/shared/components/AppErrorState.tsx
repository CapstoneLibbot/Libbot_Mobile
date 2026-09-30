import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

interface AppErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function AppErrorState({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}: AppErrorStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppText variant="heading" color={colors.danger}>!</AppText>
      </View>
      <AppText variant="heading" color={colors.danger} style={styles.title}>
        {title}
      </AppText>
      <AppText color={colors.subtext} style={styles.message}>
        {message}
      </AppText>
      {onRetry ? (
        <View style={styles.actionContainer}>
          <AppButton title="Thử lại" onPress={onRetry} variant="secondary" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
