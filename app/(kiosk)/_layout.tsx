import { useIdleTimeout, useKioskOrientation } from "@/core";
import { useKeepAwake } from "expo-keep-awake";
import { router, Stack } from "expo-router";
import React from "react";

export default function KioskLayout(): React.ReactElement {
  // Keep tablet screen awake for robot kiosk operations
  useKeepAwake();

  // Enforce landscape orientation dynamically while inside the kiosk route tree
  useKioskOrientation();

  // Reset session and return to idle when kiosk is inactive and no mission is active
  useIdleTimeout({
    onTimeout: () => {
      router.replace("/(kiosk)/idle");
    },
  });

  return <Stack screenOptions={{ headerShown: false }} />;
}
