import { Stack } from 'expo-router';
import React from 'react';
import { AppProviders } from '../src/core/providers/AppProviders';

export default function RootLayout(): React.ReactElement {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
