import { useQuery } from "@tanstack/react-query";
import { getFacilitiesRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { FacilityArea } from "../types/facility.types";

export const useFacilities = () => {
  return useQuery<FacilityArea[], Error>({
    queryKey: queryKeys.facilities.list(),
    queryFn: () => getFacilitiesRepository().getAll(),
  });
};
