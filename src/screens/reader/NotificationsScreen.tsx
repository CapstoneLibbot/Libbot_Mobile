import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { notificationsMock } from '../../mocks/notifications.mock';
import { colors, spacing } from '../../theme';

export default function NotificationsScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Notifications</AppText>

      {notificationsMock.map((notification) => (
        <AppCard key={notification.id} style={styles.card}>
          <AppText variant="subtitle">{notification.title}</AppText>
          <AppText color={colors.subtext}>{notification.message}</AppText>
          <AppText color={colors.subtext}>{new Date(notification.timestamp).toLocaleString()}</AppText>
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

