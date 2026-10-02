import { Stack } from "expo-router";
import React from "react";
import { AppProviders } from "@/core/providers";

export default function RootLayout(): React.ReactElement {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
