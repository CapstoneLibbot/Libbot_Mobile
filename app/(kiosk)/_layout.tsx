import { kioskTimeoutConfig, useIdleTimeout, useKioskOrientation } from "@/core";
import { useKioskStore } from "@/core/state";
import { useKeepAwake } from "expo-keep-awake";
import { router, Stack, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function KioskLayout(): React.ReactElement {
  // Keep tablet screen awake for robot kiosk operations
  useKeepAwake();

  // Enforce landscape orientation dynamically while inside the kiosk route tree
  useKioskOrientation();

  const pathname = usePathname();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const lastMoveInteractionRef = React.useRef(0);

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

  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={() => {
        // Ghi nhận ngay lập tức khi người dùng bắt đầu chạm màn hình
        recordInteraction();
        return false;
      }}
      onMoveShouldSetResponderCapture={() => {
        // Giới hạn tần suất ghi nhận khi vuốt/cuộn (tối đa 1 lần / giây) để giữ mượt mà 60fps
        const now = Date.now();
        if (now - lastMoveInteractionRef.current >= 1000) {
          lastMoveInteractionRef.current = now;
          recordInteraction();
        }
        return false;
      }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

