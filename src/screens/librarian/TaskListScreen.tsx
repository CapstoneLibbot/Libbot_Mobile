import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { tasksMock } from '../../mocks/tasks.mock';
import { colors, spacing } from '../../theme';

export default function TaskListScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Tasks</AppText>

      {tasksMock.map((task) => (
        <AppCard key={task.id} style={styles.card}>
          <AppText variant="subtitle">{task.title}</AppText>
          <AppText color={colors.subtext}>{task.description}</AppText>
          <AppText>Status: {task.status}</AppText>
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

