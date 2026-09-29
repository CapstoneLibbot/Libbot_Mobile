import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton, AppCard, AppText } from '../../components/common';
import { booksMock } from '../../mocks/books.mock';
import { notificationsMock } from '../../mocks/notifications.mock';
import { missionsMock } from '../../mocks/missions.mock';
import { colors, spacing } from '../../theme';

export default function ReaderHomeScreen(): React.ReactElement {
  const activeMission = missionsMock[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Welcome back</AppText>
      <AppText color={colors.subtext} style={styles.subtitle}>Find books and let LiBot guide you through the library.</AppText>

      <AppCard style={styles.summaryCard}>
        <AppText variant="heading">Guidance status</AppText>
        <AppText variant="subtitle" style={styles.missionTitle}>Mission {activeMission.id}</AppText>
        <AppText>{activeMission.progress}% complete</AppText>
      </AppCard>

      <View style={styles.buttonRow}>
        <AppButton title="Search books" onPress={() => router.push('/(reader)/search')} style={styles.button} />
        <AppButton title="Library map" variant="secondary" onPress={() => router.push('/(reader)/facility/reading-area')} style={styles.button} />
      </View>

      <AppCard style={styles.sectionCard}>
        <AppText variant="heading">Recommended books</AppText>
        {booksMock.slice(0, 2).map((book) => (
          <View key={book.id} style={styles.listRow}>
            <View>
              <AppText variant="subtitle">{book.title}</AppText>
              <AppText color={colors.subtext}>{book.author}</AppText>
            </View>
            <AppButton title="Open" variant="secondary" onPress={() => router.push(`/(reader)/book/${book.id}`)} />
          </View>
        ))}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="heading">Recent notifications</AppText>
        {notificationsMock.slice(0, 2).map((notification) => (
          <View key={notification.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{notification.title}</AppText>
              <AppText color={colors.subtext}>{notification.message}</AppText>
            </View>
          </View>
        ))}
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
    gap: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.primarySoft,
  },
  missionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
  sectionCard: {
    gap: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});

