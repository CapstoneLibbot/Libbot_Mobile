import { FacilityDetailScreen } from "@/features/facilities";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function FacilityDetailRoute(): React.ReactElement {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();

  return (
    <FacilityDetailScreen
      facilityId={facilityId ?? ""}
      onBack={() => {
        router.back();
      }}
    />
  );
}
