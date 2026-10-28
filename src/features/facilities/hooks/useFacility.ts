import { useQuery } from "@tanstack/react-query";
import { getFacilitiesRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { FacilityDetail } from "../types/facility.types";

export const useFacility = (facilityId: string) => {
  return useQuery<FacilityDetail | null, Error>({
    queryKey: queryKeys.facilities.detail(facilityId),
    queryFn: () => getFacilitiesRepository().getById(facilityId),
    enabled: Boolean(facilityId),
  });
};
