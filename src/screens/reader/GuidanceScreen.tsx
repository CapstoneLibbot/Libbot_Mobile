import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppButton, AppCard, AppText } from '../../components/common';
import { MobileMap } from '../../components/map/MobileMap';
import { missionsMock } from '../../mocks/missions.mock';
import { colors, spacing } from '../../theme';

export default function GuidanceScreen(): React.ReactElement {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const mission = missionsMock.find((item) => item.id === missionId) ?? missionsMock[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Guidance tracking</AppText>

      <AppCard>
        <AppText variant="heading">Mission {mission.id}</AppText>
        <AppText style={styles.progressLabel}>{mission.progress}% completed</AppText>
      </AppCard>

      <AppCard>
        <AppText variant="heading">Robot position</AppText>
        <AppText>Robot: {mission.robotId ?? 'R-01'}</AppText>
        <AppText>Destination: x {mission.destination?.x}, y {mission.destination?.y}</AppText>
      </AppCard>

      <AppCard>
        <AppText variant="heading">Route</AppText>
        <MobileMap />
      </AppCard>

      <AppButton title="Rate service" onPress={() => undefined} />
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
  progressLabel: {
    marginTop: spacing.sm,
  },
});

