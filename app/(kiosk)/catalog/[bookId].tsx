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
      onOpenFacility={(facilityId, meta) => {
        const queryParams = new URLSearchParams();
        if (meta?.bookTitle) queryParams.set("bookTitle", meta.bookTitle);
        if (meta?.locationLabel) queryParams.set("locationLabel", meta.locationLabel);
        const queryStr = queryParams.toString();
        router.push(
          `/(kiosk)/facilities/${encodeURIComponent(facilityId)}${queryStr ? `?${queryStr}` : ""}` as any,
        );
      }}
      onStartGuidance={(endpointId) => {
        router.push(`/(kiosk)/guidance/map?endpointId=${encodeURIComponent(endpointId)}`);
      }}
    />
  );
}
