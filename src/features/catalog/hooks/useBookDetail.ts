import { useQuery } from "@tanstack/react-query";
import { getCatalogRepository } from "@/core/composition";
import { queryKeys } from "@/core/state";
import { Book } from "../types/catalog.types";

export const useBookDetail = (bookId: string) => {
  return useQuery<Book | null, Error>({
    queryKey: queryKeys.catalog.detail(bookId),
    queryFn: () => getCatalogRepository().getById(bookId),
    enabled: Boolean(bookId),
  });
};
