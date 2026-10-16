import { FacilityDetailScreen } from "@/features/facilities";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function FacilityDetailRoute(): React.ReactElement {
  const { facilityId, bookId, bookItemId } = useLocalSearchParams<{
    facilityId: string;
    bookId?: string;
    bookItemId?: string;
  }>();

  return (
    <FacilityDetailScreen
      facilityId={facilityId ?? ""}
      bookId={bookId}
      bookItemId={bookItemId}
      onBack={() => {
        router.back();
      }}
    />
  );
}
