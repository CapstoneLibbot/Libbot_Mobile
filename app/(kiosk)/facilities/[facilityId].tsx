import { FacilityDetailScreen } from "@/features/facilities";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function FacilityDetailRoute(): React.ReactElement {
  const { facilityId, bookTitle, locationLabel } = useLocalSearchParams<{
    facilityId: string;
    bookTitle?: string;
    locationLabel?: string;
  }>();

  return (
    <FacilityDetailScreen
      facilityId={facilityId ?? ""}
      bookTitle={bookTitle}
      locationLabel={locationLabel}
      onStartGuidance={(id) =>
        router.push(`/(kiosk)/facilities/${encodeURIComponent(id)}/guidance`)
      }
      onBack={() => {
        router.back();
      }}
    />
  );
}
