import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGuidanceRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { signalRClient } from "@/platform/realtime";
import { GuidanceJob } from "../types/guidance.types";

export const useGuidanceJob = (jobId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;

    void signalRClient.connect().catch(() => {});

    const unsubscribeStatus = signalRClient.on(
      "JobStatusChanged",
      (payload) => {
        if (payload.jobId === jobId) {
          queryClient.setQueryData<GuidanceJob | null>(
            queryKeys.guidance.detail(jobId),
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

    const unsubscribeStep = signalRClient.on("JobStepChanged", (payload) => {
      if (payload.jobId === jobId) {
        queryClient.setQueryData<GuidanceJob | null>(
          queryKeys.guidance.detail(jobId),
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
  }, [jobId, queryClient]);

  return useQuery<GuidanceJob | null, Error>({
    queryKey: queryKeys.guidance.detail(jobId),
    queryFn: () => getGuidanceRepository().getJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: 3000,
  });
};
