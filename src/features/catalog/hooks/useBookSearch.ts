import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getCatalogRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { Book, BookSearchFilter, BookSearchPage } from "../types/catalog.types";

const DEFAULT_PAGE_SIZE = 20;

export const useBookSearch = (filter?: BookSearchFilter) => {
  return useQuery<Book[], Error>({
    queryKey: queryKeys.catalog.search(filter),
    queryFn: () => getCatalogRepository().search(filter),
  });
};

export const useInfiniteBookSearch = (
  filter?: BookSearchFilter,
  pageSize = DEFAULT_PAGE_SIZE,
) => {
  return useInfiniteQuery<BookSearchPage, Error>({
    queryKey: [...queryKeys.catalog.search(filter), "infinite", pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const repo = getCatalogRepository();
      if (repo.searchPage) {
        return repo.searchPage({
          ...filter,
          page: Number(pageParam),
          pageSize,
        });
      }
      const books = await repo.search(filter);
      return {
        books,
        page: 1,
        pageSize: books.length || pageSize,
        totalCount: books.length,
        totalPages: 1,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
};
