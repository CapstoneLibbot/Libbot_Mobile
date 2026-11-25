import { GuidanceScreen } from "@/features/guidance";
import { useKioskStore } from "@/core/state";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function GuidanceMapRoute(): React.ReactElement | null {
  const { endpointId } = useLocalSearchParams<{ endpointId?: string }>();
  const session = useKioskStore((state) => state.activeGuidanceSession);
  const effectiveEndpointId = session?.destinationId ?? endpointId ?? "";

  if (!effectiveEndpointId) {
    return null;
  }

  return (
    <GuidanceScreen
      endpointId={effectiveEndpointId}
      onGoToFeedback={(jobId) => router.replace(`/(kiosk)/feedback/${jobId}`)}
      onBackToSearch={() => router.replace("/(kiosk)/search")}
    />
  );
}
