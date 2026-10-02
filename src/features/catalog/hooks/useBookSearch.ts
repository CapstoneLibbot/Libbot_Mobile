import { useQuery } from "@tanstack/react-query";
import { getCatalogRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { Book, BookSearchFilter } from "../types/catalog.types";

export const useBookSearch = (filter?: BookSearchFilter) => {
  return useQuery<Book[], Error>({
    queryKey: queryKeys.catalog.search(filter),
    queryFn: () => getCatalogRepository().search(filter),
  });
};
