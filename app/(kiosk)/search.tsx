import { CatalogSearchScreen } from "@/features/catalog";
import { router } from "expo-router";
import React from "react";

export default function SearchRoute(): React.ReactElement {
  return (
    <CatalogSearchScreen
      onSelectBook={(bookId) => {
        router.push(`/(kiosk)/catalog/${bookId}`);
      }}
      onStartGuidance={(endpointId) => {
        router.push(`/(kiosk)/guidance/map?endpointId=${encodeURIComponent(endpointId)}`);
      }}
      onBackToIdle={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
