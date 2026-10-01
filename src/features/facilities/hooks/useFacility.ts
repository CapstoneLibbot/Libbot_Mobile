import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../core/queryKeys";
import { facilitiesRepository } from "../../../infrastructure/repositories/facilities.repository";
import { FacilityArea } from "../types/facility.types";

export const useFacility = (facilityId: string) => {
  return useQuery<FacilityArea | null, Error>({
    queryKey: queryKeys.facilities.detail(facilityId),
    queryFn: () => facilitiesRepository.getById(facilityId),
    enabled: Boolean(facilityId),
  });
};
