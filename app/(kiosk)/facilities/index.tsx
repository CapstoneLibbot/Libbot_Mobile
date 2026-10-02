import { FacilitySearchScreen } from "@/features/facilities";
import { router } from "expo-router";
import React from "react";

export default function FacilitiesSearchRoute(): React.ReactElement {
  return (
    <FacilitySearchScreen
      onSelectFacility={(facilityId) => {
        router.push(`/(kiosk)/facilities/${facilityId}`);
      }}
      onBackToIdle={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
