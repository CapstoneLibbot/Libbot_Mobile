import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../core/queryKeys";
import { catalogRepository } from "../../../infrastructure/repositories/catalog.repository";
import { Book } from "../types/catalog.types";

export const useBookDetail = (bookId: string) => {
  return useQuery<Book | null, Error>({
    queryKey: queryKeys.catalog.detail(bookId),
    queryFn: () => catalogRepository.getById(bookId),
    enabled: Boolean(bookId),
  });
};
