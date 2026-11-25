import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getFacilitiesRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import {
  FacilitySearchFilter,
  FacilitySearchItem,
  FacilitySearchPage,
} from "../types/facility.types";

const DEFAULT_PAGE_SIZE = 20;

export const useFacilities = (filter?: FacilitySearchFilter) => {
  return useQuery<FacilitySearchItem[], Error>({
    queryKey: queryKeys.facilities.list(filter),
    queryFn: () => getFacilitiesRepository().search(filter),
  });
};

export const useInfiniteFacilities = (
  filter?: FacilitySearchFilter,
  pageSize = DEFAULT_PAGE_SIZE,
) => {
  return useInfiniteQuery<FacilitySearchPage, Error>({
    queryKey: [...queryKeys.facilities.list(filter), "infinite", pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const repo = getFacilitiesRepository();
      if (repo.searchPage) {
        return repo.searchPage({
          ...filter,
          page: Number(pageParam),
          pageSize,
        });
      }
      const items = await repo.search(filter);
      return {
        items,
        page: 1,
        pageSize: items.length || pageSize,
        totalCount: items.length,
        totalPages: 1,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
};
