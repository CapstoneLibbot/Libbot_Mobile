import { router } from "expo-router";
import React from "react";
import { IdleAttractScreen } from "@/features/idle";
import { useKioskStore } from "@/core/state";

export default function IdleRoute(): React.ReactElement {
  const setActiveGuidanceSession = useKioskStore((state) => state.setActiveGuidanceSession);
  return (
    <IdleAttractScreen
      onNavigateToSearch={() => router.push("/(kiosk)/search")}
      onNavigateToFacilities={() => router.push("/(kiosk)/facilities")}
      onNavigateToSettings={() => router.push("/(kiosk)/settings" as any)}
      onNavigateToBook={(bookId) => {
        router.push(`/(kiosk)/catalog/${bookId}`);
      }}
      onNavigateToLocation={(endpointId) => {
        router.push(`/(kiosk)/facilities/${endpointId}`);
      }}
      onGuidanceStarted={(guidance) => {
        setActiveGuidanceSession(guidance);
        router.replace(`/(kiosk)/guidance/map?jobId=${encodeURIComponent(guidance.jobId)}`);
      }}
    />
  );
}
