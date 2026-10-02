import { FeedbackScreen } from "@/features/feedback";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function FeedbackRoute(): React.ReactElement {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();

  return (
    <FeedbackScreen
      missionId={missionId ?? ""}
      onComplete={() => {
        router.replace("/(kiosk)/idle");
      }}
      onSkip={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
