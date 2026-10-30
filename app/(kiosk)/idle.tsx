import { router } from "expo-router";
import React from "react";
import { IdleAttractScreen } from "@/features/idle";

export default function IdleRoute(): React.ReactElement {
  return (
    <IdleAttractScreen
      onNavigateToSearch={() => router.push("/(kiosk)/search")}
      onNavigateToFacilities={() => router.push("/(kiosk)/facilities")}
      onNavigateToBook={(bookId) => {
        router.push(`/(kiosk)/catalog/${bookId}`);
      }}
    />
  );
}
