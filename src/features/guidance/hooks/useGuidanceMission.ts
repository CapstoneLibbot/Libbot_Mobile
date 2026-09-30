import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../core/queryKeys';
import { guidanceRepository } from '../../../infrastructure/repositories/guidance.repository';
import { GuidanceMission } from '../types/guidance.types';

export const useGuidanceMission = (missionId: string) => {
  return useQuery<GuidanceMission | null, Error>({
    queryKey: queryKeys.guidance.detail(missionId),
    queryFn: () => guidanceRepository.getMission(missionId),
    enabled: Boolean(missionId),
    refetchInterval: 3000,
  });
};
