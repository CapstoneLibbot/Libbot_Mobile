import { GuidanceScreen } from "@/features/guidance";
import { useKioskStore } from "@/core/state";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function GuidanceMapRoute(): React.ReactElement {
  const { endpointId } = useLocalSearchParams<{ endpointId?: string }>();
  const session = useKioskStore((state) => state.activeGuidanceSession);

  return (
    <GuidanceScreen
      endpointId={session?.destinationId ?? endpointId ?? ""}
      onGoToFeedback={(jobId) => router.push(`/(kiosk)/feedback/${jobId}`)}
      onBackToSearch={() => router.replace("/(kiosk)/search")}
    />
  );
}
