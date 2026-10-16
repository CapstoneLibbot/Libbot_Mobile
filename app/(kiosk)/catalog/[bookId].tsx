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
      onOpenFacility={(facilityId, targetBookId, bookItemId) => {
        const bookQuery = targetBookId && bookItemId
          ? `?bookId=${encodeURIComponent(targetBookId)}&bookItemId=${encodeURIComponent(bookItemId)}`
          : "";
        router.push(`/(kiosk)/facilities/${facilityId}${bookQuery}`);
      }}
      onStartGuidance={(targetBookId, bookItemId) => {
        router.push(`/(kiosk)/guidance/map?bookId=${encodeURIComponent(targetBookId)}&bookItemId=${encodeURIComponent(bookItemId)}`);
      }}
    />
  );
}
