import { GuidanceScreen } from "@/features/guidance";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function GuidanceMapRoute(): React.ReactElement {
  const { endpointId } = useLocalSearchParams<{ endpointId: string }>();

  return (
    <GuidanceScreen
      endpointId={endpointId ?? ""}
      onGoToFeedback={(missionId) => router.push(`/(kiosk)/feedback/${missionId}`)}
      onBackToSearch={() => router.replace("/(kiosk)/search")}
    />
  );
}
