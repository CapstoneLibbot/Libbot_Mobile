import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton, AppCard, AppText } from '../../components/common';
import { tasksMock } from '../../mocks/tasks.mock';
import { robotsMock } from '../../mocks/robots.mock';
import { colors, spacing } from '../../theme';

export default function LibrarianDashboardScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Dashboard</AppText>

      <View style={styles.metricsRow}>
        <AppCard style={styles.metricCard}><AppText variant="heading">Tasks</AppText><AppText>{tasksMock.length}</AppText></AppCard>
        <AppCard style={styles.metricCard}><AppText variant="heading">Robots</AppText><AppText>{robotsMock.length}</AppText></AppCard>
      </View>

      <AppCard>
        <AppText variant="heading">Active robots</AppText>
        {robotsMock.map((robot) => (
          <View key={robot.robotId} style={styles.listRow}>
            <AppText>{robot.name}</AppText>
            <AppText color={robot.connected ? colors.success : colors.danger}>{robot.battery}%</AppText>
          </View>
        ))}
      </AppCard>

      <AppButton title="Open tasks" onPress={() => undefined} />
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
    gap: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
});

