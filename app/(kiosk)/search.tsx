import { CatalogSearchScreen } from "@/features/catalog";
import { router } from "expo-router";
import React from "react";

export default function SearchRoute(): React.ReactElement {
  return (
    <CatalogSearchScreen
      onSelectBook={(bookId) => {
        router.push(`/(kiosk)/catalog/${bookId}`);
      }}
      onStartGuidance={(endpointId, params) => {
        const searchParams = new URLSearchParams({ endpointId });
        if (params?.bookId) searchParams.set("bookId", params.bookId);
        if (params?.bookItemId) searchParams.set("bookItemId", params.bookItemId);
        if (params?.query) searchParams.set("query", params.query);
        router.push(`/(kiosk)/guidance/map?${searchParams.toString()}` as any);
      }}
      onBackToIdle={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
