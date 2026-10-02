import { CatalogSearchScreen } from "@/features/catalog";
import { router } from "expo-router";
import React from "react";

export default function SearchRoute(): React.ReactElement {
  return (
    <CatalogSearchScreen
      onSelectBook={(bookId) => {
        router.push(`/(kiosk)/catalog/${bookId}`);
      }}
      onStartGuidance={(missionId) => {
        router.push(`/(kiosk)/guidance/${missionId}`);
      }}
      onBackToIdle={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
