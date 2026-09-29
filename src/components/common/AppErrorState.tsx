import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from './AppText';

interface AppErrorStateProps {
  title?: string;
  message?: string;
}

export function AppErrorState({ title = 'Something went wrong', message = 'Please try again shortly.' }: AppErrorStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <AppText variant="heading" color={colors.danger}>{title}</AppText>
      <AppText color={colors.subtext} style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

