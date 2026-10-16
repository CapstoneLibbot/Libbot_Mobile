import { CatalogSearchScreen } from "@/features/catalog";
import { router } from "expo-router";
import React from "react";

export default function SearchRoute(): React.ReactElement {
  return (
    <CatalogSearchScreen
      onSelectBook={(bookId) => {
        router.push(`/(kiosk)/catalog/${bookId}`);
      }}
      onStartGuidance={(bookId, bookItemId) => {
        router.push(`/(kiosk)/guidance/map?bookId=${encodeURIComponent(bookId)}&bookItemId=${encodeURIComponent(bookItemId)}`);
      }}
      onBackToIdle={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
