import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { tasksMock } from '../../mocks/tasks.mock';
import { colors, spacing } from '../../theme';

export default function TaskDetailScreen(): React.ReactElement {
  const task = tasksMock[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Task detail</AppText>
      <AppCard style={styles.card}>
        <AppText variant="heading">{task.title}</AppText>
        <AppText>{task.description}</AppText>
        <AppText>Status: {task.status}</AppText>
        <AppText>Priority: {task.priority}</AppText>
        <AppText>Robot: {task.assignedRobotId}</AppText>
      </AppCard>
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
  },
  card: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

