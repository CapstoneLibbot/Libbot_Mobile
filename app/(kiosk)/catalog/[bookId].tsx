import { BookDetailScreen } from "@/features/catalog";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function BookDetailRoute(): React.ReactElement {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  return (
    <BookDetailScreen
      bookId={bookId ?? ""}
      onBack={() => {
        router.back();
      }}
      onOpenFacility={(facilityId) => {
        router.push(`/(kiosk)/facilities/${facilityId}`);
      }}
      onStartGuidance={(endpointId) => {
        router.push(`/(kiosk)/guidance/map?endpointId=${encodeURIComponent(endpointId)}`);
      }}
    />
  );
}
