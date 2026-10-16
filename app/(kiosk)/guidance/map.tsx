import { GuidanceScreen } from "@/features/guidance";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function GuidanceMapRoute(): React.ReactElement {
  const { bookId, bookItemId } = useLocalSearchParams<{ bookId: string; bookItemId: string }>();

  return (
    <GuidanceScreen
      bookId={bookId ?? ""}
      bookItemId={bookItemId ?? ""}
      onGoToFeedback={(missionId) => router.push(`/(kiosk)/feedback/${missionId}`)}
      onBackToSearch={() => router.replace("/(kiosk)/search")}
    />
  );
}
