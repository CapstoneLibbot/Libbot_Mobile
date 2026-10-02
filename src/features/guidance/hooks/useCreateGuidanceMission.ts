import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGuidanceRepository } from "@/core/composition";
import { queryKeys, useKioskStore } from "@/core/state";
import { CreateMissionRequest, GuidanceMission } from "../types/guidance.types";

export const useCreateGuidanceMission = () => {
  const queryClient = useQueryClient();
  const setActiveMissionId = useKioskStore((state) => state.setActiveMissionId);

  return useMutation<GuidanceMission, Error, CreateMissionRequest>({
    mutationFn: (req) => getGuidanceRepository().createMission(req),
    onSuccess: (mission) => {
      setActiveMissionId(mission.id);
      queryClient.setQueryData(queryKeys.guidance.detail(mission.id), mission);
    },
  });
};
