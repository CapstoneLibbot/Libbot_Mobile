import { FeedbackScreen } from "@/features/feedback";
import { router, useLocalSearchParams } from "expo-router";
import { useKioskStore } from "@/core/state";
import React from "react";

export default function FeedbackRoute(): React.ReactElement {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const session = useKioskStore((state) => state.activeGuidanceSession);

  return (
    <FeedbackScreen
      jobId={session?.jobId ?? jobId ?? ""}
      guidanceKind={session?.guidanceKind ?? "BOOK_GUIDANCE"}
      terminalStatus={session?.terminalStatus ?? "COMPLETED"}
      destinationName={session?.destinationName ?? "địa điểm đã chọn"}
      onComplete={() => {
        router.replace("/(kiosk)/idle");
      }}
      onSkip={() => {
        router.replace("/(kiosk)/idle");
      }}
    />
  );
}
