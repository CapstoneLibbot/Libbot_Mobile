import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGuidanceRepository } from "@/core/composition";
import { queryKeys, useKioskStore } from "@/core/state";
import { CreateJobRequest, GuidanceJob } from "../types/guidance.types";

export const useCreateGuidanceJob = () => {
  const queryClient = useQueryClient();
  const setActiveJobId = useKioskStore((state) => state.setActiveJobId);

  return useMutation<GuidanceJob, Error, CreateJobRequest>({
    mutationFn: (req) => getGuidanceRepository().createJob(req),
    onSuccess: (job) => {
      setActiveJobId(job.id);
      queryClient.setQueryData(queryKeys.guidance.detail(job.id), job);
    },
  });
};
