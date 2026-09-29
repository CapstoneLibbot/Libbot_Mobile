import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { colors, spacing } from '../../theme';

const alerts = [
  { id: 'a-1', title: 'Battery warning', detail: 'Robot R-03 is below 20% and needs charging.' },
  { id: 'a-2', title: 'Connection issue', detail: 'Network quality is degraded in the east wing.' },
];

export default function AlertsScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Alerts</AppText>
      {alerts.map((alert) => (
        <AppCard key={alert.id} style={styles.card}>
          <AppText variant="subtitle">{alert.title}</AppText>
          <AppText color={colors.subtext}>{alert.detail}</AppText>
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
});

