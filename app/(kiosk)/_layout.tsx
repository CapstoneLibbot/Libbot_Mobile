import { useKeepAwake } from "expo-keep-awake";
import { router, Stack } from "expo-router";
import React from "react";
import { useIdleTimeout } from "../../src/core/hooks/useIdleTimeout";

export default function KioskLayout(): React.ReactElement {
  // Keep tablet screen awake for robot kiosk operations
  useKeepAwake();

  // Reset session and return to idle when kiosk is inactive and no mission is active
  useIdleTimeout({
    onTimeout: () => {
      router.replace("/(kiosk)/idle");
    },
  });

  return <Stack screenOptions={{ headerShown: false }} />;
}
