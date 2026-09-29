import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { robotsMock } from '../../mocks/robots.mock';
import { colors, spacing } from '../../theme';

export default function RobotMonitoringScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Robot monitoring</AppText>

      {robotsMock.map((robot) => (
        <AppCard key={robot.robotId} style={styles.card}>
          <AppText variant="subtitle">{robot.name}</AppText>
          <AppText>Status: {robot.status}</AppText>
          <AppText>Battery: {robot.battery}%</AppText>
          <AppText>Connection: {robot.connected ? 'Online' : 'Offline'}</AppText>
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

