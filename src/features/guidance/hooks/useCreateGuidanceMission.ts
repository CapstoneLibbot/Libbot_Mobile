import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/queryKeys';
import { useKioskStore } from '../../../core/store/kioskStore';
import { guidanceRepository } from '../../../infrastructure/repositories/guidance.repository';
import { CreateMissionRequest, GuidanceMission } from '../types/guidance.types';

export const useCreateGuidanceMission = () => {
  const queryClient = useQueryClient();
  const setActiveMissionId = useKioskStore((state) => state.setActiveMissionId);

  return useMutation<GuidanceMission, Error, CreateMissionRequest>({
    mutationFn: (req) => guidanceRepository.createMission(req),
    onSuccess: (mission) => {
      setActiveMissionId(mission.id);
      queryClient.setQueryData(queryKeys.guidance.detail(mission.id), mission);
    },
  });
};
