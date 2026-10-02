import { GuidanceScreen } from "@/features/guidance";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function GuidanceRoute(): React.ReactElement {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();

  return (
    <GuidanceScreen
      missionId={missionId ?? ""}
      onGoToFeedback={(id) => {
        router.push(`/(kiosk)/feedback/${id}`);
      }}
      onBackToSearch={() => {
        router.replace("/(kiosk)/search");
      }}
    />
  );
}
