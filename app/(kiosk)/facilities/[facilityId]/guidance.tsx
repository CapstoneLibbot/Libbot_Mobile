import { FacilityGuidanceScreen } from "@/features/facilities";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function FacilityGuidanceRoute(): React.ReactElement {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  return <FacilityGuidanceScreen facilityId={facilityId ?? ""} onBack={() => router.back()} onGoToFeedback={(jobId) => router.push(`/(kiosk)/feedback/${encodeURIComponent(jobId)}`)} />;
}
