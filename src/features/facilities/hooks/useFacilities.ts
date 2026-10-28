import { useQuery } from "@tanstack/react-query";
import { getFacilitiesRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { FacilitySearchFilter, FacilitySearchItem } from "../types/facility.types";

export const useFacilities = (filter?: FacilitySearchFilter) => {
  return useQuery<FacilitySearchItem[], Error>({
    queryKey: queryKeys.facilities.list(filter),
    queryFn: () => getFacilitiesRepository().search(filter),
  });
};
