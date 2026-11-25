import { GuidanceScreen } from "@/features/guidance";
import type { GuidanceKind } from "@/features/guidance/types/guidance.types";
import { useKioskStore } from "@/core/state";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

export default function GuidanceMapRoute(): React.ReactElement | null {
  const { endpointId, bookId, bookItemId, facilityId, query, guidanceKind } =
    useLocalSearchParams<{
      endpointId?: string;
      bookId?: string;
      bookItemId?: string;
      facilityId?: string;
      query?: string;
      guidanceKind?: GuidanceKind;
    }>();
  const session = useKioskStore((state) => state.activeGuidanceSession);
  const effectiveEndpointId = endpointId || session?.destinationId || "";

  if (!effectiveEndpointId) {
    return null;
  }

  return (
    <GuidanceScreen
      endpointId={effectiveEndpointId}
      bookId={bookId}
      bookItemId={bookItemId}
      facilityId={facilityId}
      initialQuery={query}
      guidanceKind={guidanceKind}
      onGoToFeedback={(jobId) => router.replace(`/(kiosk)/feedback/${jobId}`)}
      onBackToSearch={() => router.replace("/(kiosk)/search")}
    />
  );
}
