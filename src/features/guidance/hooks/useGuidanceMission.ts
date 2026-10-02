import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGuidanceRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { signalRClient } from "@/platform/realtime";
import { GuidanceMission } from "../types/guidance.types";

export const useGuidanceMission = (missionId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!missionId) return;

    void signalRClient.connect().catch(() => {});

    const unsubscribeStatus = signalRClient.on(
      "MissionStatusChanged",
      (payload) => {
        if (payload.missionId === missionId) {
          queryClient.setQueryData<GuidanceMission | null>(
            queryKeys.guidance.detail(missionId),
            (prev) =>
              prev
                ? {
                    ...prev,
                    status: payload.status,
                    progress: payload.progress ?? prev.progress,
                  }
                : null,
          );
        }
      },
    );

    const unsubscribeStep = signalRClient.on("MissionStepChanged", (payload) => {
      if (payload.missionId === missionId) {
        queryClient.setQueryData<GuidanceMission | null>(
          queryKeys.guidance.detail(missionId),
          (prev) =>
            prev
              ? {
                  ...prev,
                  progress: payload.progress ?? prev.progress,
                }
              : null,
        );
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeStep();
    };
  }, [missionId, queryClient]);

  return useQuery<GuidanceMission | null, Error>({
    queryKey: queryKeys.guidance.detail(missionId),
    queryFn: () => getGuidanceRepository().getMission(missionId),
    enabled: Boolean(missionId),
    refetchInterval: 3000,
  });
};
