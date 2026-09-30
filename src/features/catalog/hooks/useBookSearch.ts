import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../core/queryKeys';
import { catalogRepository } from '../../../infrastructure/repositories/catalog.repository';
import { Book, BookSearchFilter } from '../types/catalog.types';

export const useBookSearch = (filter?: BookSearchFilter) => {
  return useQuery<Book[], Error>({
    queryKey: queryKeys.catalog.search(filter),
    queryFn: () => catalogRepository.search(filter),
  });
};
