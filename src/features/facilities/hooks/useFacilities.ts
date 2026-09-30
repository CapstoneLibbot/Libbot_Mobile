import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../core/queryKeys';
import { facilitiesRepository } from '../../../infrastructure/repositories/facilities.repository';
import { FacilityArea } from '../types/facility.types';

export const useFacilities = () => {
  return useQuery<FacilityArea[], Error>({
    queryKey: queryKeys.facilities.list(),
    queryFn: () => facilitiesRepository.getAll(),
  });
};
