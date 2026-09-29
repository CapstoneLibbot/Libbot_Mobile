import { Tabs } from 'expo-router';
import React from 'react';
import { colors } from '../../src/theme';

export default function ReaderLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="guidance/[missionId]" options={{ title: 'Guidance' }} />
    </Tabs>
  );
}
