import { useIdleTimeout, useKioskOrientation } from "@/core";
import { useKeepAwake } from "expo-keep-awake";
import { router, Stack, usePathname } from "expo-router";
import React from "react";

export default function KioskLayout(): React.ReactElement {
  // Keep tablet screen awake for robot kiosk operations
  useKeepAwake();

  // Enforce landscape orientation dynamically while inside the kiosk route tree
  useKioskOrientation();

  const pathname = usePathname();

  // Reset session and return to idle when kiosk is inactive and no job is active
  useIdleTimeout({
    onTimeout: () => {
      if (pathname && !pathname.endsWith("/idle") && pathname !== "/") {
        router.replace("/(kiosk)/idle");
      }
    },
  });

  return <Stack screenOptions={{ headerShown: false }} />;
}
