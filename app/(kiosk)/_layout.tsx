import { kioskTimeoutConfig, useIdleTimeout, useKioskOrientation } from "@/core";
import { useKeepAwake } from "expo-keep-awake";
import { router, Stack, usePathname } from "expo-router";
import React from "react";

export default function KioskLayout(): React.ReactElement {
  // Keep tablet screen awake for robot kiosk operations
  useKeepAwake();

  // Enforce landscape orientation dynamically while inside the kiosk route tree
  useKioskOrientation();

  const pathname = usePathname();

  // Reset session and return to idle when kiosk is inactive and no mission is active
  useIdleTimeout({
    onTimeout: () => {
      if (pathname && !pathname.endsWith("/idle") && pathname !== "/") {
        if (__DEV__) {
          console.log(
            `[KioskLayout] Inactivity timeout (${kioskTimeoutConfig.kioskIdleSeconds}s) triggered. Navigating from "${pathname}" to "/(kiosk)/idle".`,
          );
        }
        router.replace("/(kiosk)/idle");
      }
    },
  });

  return <Stack screenOptions={{ headerShown: false }} />;
}
